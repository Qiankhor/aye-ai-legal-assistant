import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import speech from '@google-cloud/speech';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
});

// Initialize Google Cloud Speech client with explicit credentials
const speechClient = new speech.SpeechClient({
  keyFilename: join(__dirname, '../google-credentials.json'),
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize AWS Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint for AI legal assistant (OpenAI)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Convert conversation history to OpenAI format
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.sender === 'bot' ? 'assistant' : 'user',
      content: msg.text
    }));

    // Create conversation context for the AI
    const messages = [
      {
        role: 'system',
        content: `You are Aye, an AI Legal Assistant. You help users with legal questions, document analysis, contract review, legal research, and provide general legal guidance. You are knowledgeable about various areas of law and can help with:

- Legal document analysis and review
- Contract explanations and suggestions
- Legal research assistance
- General legal questions and guidance
- Legal form completion help
- Legal terminology explanations

Always provide helpful, accurate, and professional legal assistance. If you're unsure about something, recommend consulting with a qualified attorney for specific legal advice.`
      },
      ...formattedHistory,
      {
        role: 'user',
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString(),
      provider: 'openai'
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error processing chat request' });
  }
});

// Chat endpoint for AI legal assistant (AWS Bedrock)
app.post('/api/chat-bedrock', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation context
    let conversationContext = `You are Aye, an AI Legal Assistant. You help users with legal questions, document analysis, contract review, legal research, and provide general legal guidance. You are knowledgeable about various areas of law and can help with:

- Legal document analysis and review
- Contract explanations and suggestions
- Legal research assistance
- General legal questions and guidance
- Legal form completion help
- Legal terminology explanations

Always provide helpful, accurate, and professional legal assistance. If you're unsure about something, recommend consulting with a qualified attorney for specific legal advice.

Conversation History:
`;

    // Add conversation history
    conversationHistory.forEach(msg => {
      conversationContext += `${msg.role}: ${msg.content}\n`;
    });

    conversationContext += `\nUser: ${message}\n\nAssistant:`;

    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: conversationContext,
        max_tokens: 1000,
        temperature: 0.7
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.outputs[0].text;

    res.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString(),
      provider: 'bedrock'
    });

  } catch (error) {
    console.error('Bedrock chat error:', error);
    res.status(500).json({ error: 'Error processing Bedrock chat request' });
  }
});

// Speech to text endpoint
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioBytes = req.file.buffer.toString('base64');

    const audio = {
      content: audioBytes,
    };

    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: req.body.languageCode || 'en-US', // Default to English if no language specified
    };

    const request = {
      audio: audio,
      config: config,
    };

    console.log('Request config:', config);
    const [response] = await speechClient.recognize(request);
    console.log('Google Speech API Response:', response);
    
    if (!response || !response.results || response.results.length === 0) {
      console.log('No transcription results received');
      return res.status(400).json({ error: 'No transcription results' });
    }

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    console.log('Final transcription:', transcription);
    res.json({ transcription, results: response.results });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ error: 'Error processing audio' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing server.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});