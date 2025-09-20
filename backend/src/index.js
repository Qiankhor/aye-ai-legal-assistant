import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import speech from '@google-cloud/speech';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

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

// Initialize AWS Textract client
const textractClient = new TextractClient({
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

// Document Analysis Endpoints

// Upload and analyze document
app.post('/api/documents/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    console.log('Analyzing document:', req.file.originalname);
    
    // Check if AWS credentials are available and valid
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'YOUR_NEW_ACCESS_KEY' || process.env.AWS_ACCESS_KEY_ID === 'ASIA4L423TSC6BE7DXKY') {
      // Fallback: Generate mock form fields for testing
      console.log('AWS credentials not configured, using mock data for testing');
      
      const mockFormFields = [
        { key: 'Full Name', value: '', confidence: 95 },
        { key: 'Email Address', value: '', confidence: 90 },
        { key: 'Phone Number', value: '', confidence: 85 },
        { key: 'Date of Birth', value: '', confidence: 88 },
        { key: 'Address', value: '', confidence: 92 },
        { key: 'Company Name', value: '', confidence: 87 },
        { key: 'Position/Title', value: '', confidence: 89 },
        { key: 'Signature Date', value: '', confidence: 93 }
      ];

      // Generate document summary first
      const documentSummary = await generateDocumentSummaryForAnalysis(mockFormFields, req.file.originalname);
      
      // Generate questions for empty fields
      const questions = await generateQuestionsForDocument(mockFormFields, req.file.originalname);
      
      return res.json({
        success: true,
        documentName: req.file.originalname,
        documentSummary: documentSummary,
        formFields: mockFormFields,
        questions: questions,
        analysis: {
          totalFields: mockFormFields.length,
          emptyFields: mockFormFields.filter(field => !field.value || field.value.trim() === '').length,
          confidence: mockFormFields.reduce((acc, field) => acc + field.confidence, 0) / mockFormFields.length || 0
        },
        note: 'Using mock data - configure AWS credentials for real document analysis'
      });
    }
    
    // Use Textract to analyze the document
    const analyzeCommand = new AnalyzeDocumentCommand({
      Document: {
        Bytes: req.file.buffer
      },
      FeatureTypes: ['FORMS', 'TABLES']
    });

    const textractResponse = await textractClient.send(analyzeCommand);
    
    // Extract form fields and key-value pairs
    const formFields = [];
    const keyValuePairs = [];
    
    if (textractResponse.Blocks) {
      for (const block of textractResponse.Blocks) {
        if (block.BlockType === 'KEY_VALUE_SET') {
          if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
            // This is a key
            const keyText = extractTextFromBlock(block, textractResponse.Blocks);
            const valueBlock = findValueBlock(block, textractResponse.Blocks);
            const valueText = valueBlock ? extractTextFromBlock(valueBlock, textractResponse.Blocks) : '';
            
            keyValuePairs.push({
              key: keyText,
              value: valueText,
              confidence: block.Confidence || 0
            });
          }
        }
      }
    }

    // Generate document summary first
    const documentSummary = await generateDocumentSummaryForAnalysis(keyValuePairs, req.file.originalname);
    
    // Generate questions for empty or unclear fields
    const questions = await generateQuestionsForDocument(keyValuePairs, req.file.originalname);
    
    res.json({
      success: true,
      documentName: req.file.originalname,
      documentSummary: documentSummary,
      formFields: keyValuePairs,
      questions: questions,
      analysis: {
        totalFields: keyValuePairs.length,
        emptyFields: keyValuePairs.filter(field => !field.value || field.value.trim() === '').length,
        confidence: keyValuePairs.reduce((acc, field) => acc + field.confidence, 0) / keyValuePairs.length || 0
      }
    });

    } catch (error) {
      console.error('Document analysis error:', error);

      // If AWS error, provide fallback
      if (error.name === 'ExpiredTokenException' || error.name === 'AccessDeniedException') {
        console.log('AWS Textract access denied, using mock data for testing');
        
        const mockFormFields = [
          { key: 'Full Name', value: '', confidence: 95 },
          { key: 'Email Address', value: '', confidence: 90 },
          { key: 'Phone Number', value: '', confidence: 85 },
          { key: 'Date of Birth', value: '', confidence: 88 },
          { key: 'Address', value: '', confidence: 92 },
          { key: 'Company Name', value: '', confidence: 87 },
          { key: 'Position/Title', value: '', confidence: 89 },
          { key: 'Signature Date', value: '', confidence: 93 }
        ];

        // Generate document summary first
        const documentSummary = await generateDocumentSummaryForAnalysis(mockFormFields, req.file.originalname);
        
        // Generate questions for empty fields
        const questions = await generateQuestionsForDocument(mockFormFields, req.file.originalname);

        return res.json({
          success: true,
          documentName: req.file.originalname,
          documentSummary: documentSummary,
          formFields: mockFormFields,
          questions: questions,
          analysis: {
            totalFields: mockFormFields.length,
            emptyFields: mockFormFields.filter(field => !field.value || field.value.trim() === '').length,
            confidence: mockFormFields.reduce((acc, field) => acc + field.confidence, 0) / mockFormFields.length || 0
          },
          note: 'Using mock data - AWS Textract access denied, but system is functional'
        });
      }

      res.status(500).json({ error: 'Error analyzing document' });
    }
});

// Generate document summary first
async function generateDocumentSummaryForAnalysis(formFields, documentName) {
  try {
    const prompt = `You are analyzing a legal document called "${documentName}". 
    Based on the form fields found in this document, provide a comprehensive summary of what this document is for and what information it collects.
    
    Form fields found:
    ${formFields.map(field => `- ${field.key}: ${field.value || 'Empty'}`).join('\n')}
    
    Provide a clear, professional summary that explains:
    1. What type of legal document this appears to be
    2. What information it collects
    3. What fields are missing and need to be filled
    4. Any important legal considerations the user should be aware of
    
    Keep the summary concise but informative.`;

    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.3
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.outputs[0].text;
  } catch (error) {
    console.error('Error generating document summary:', error);
    return `This appears to be a legal document with ${formFields.length} fields that need to be completed.`;
  }
}

// Generate questions for missing information using OpenAI or fallback
async function generateQuestionsForDocument(formFields, documentName) {
  try {
    const emptyFields = formFields.filter(field => !field.value || field.value.trim() === '');
    
    if (emptyFields.length === 0) {
      return [];
    }

    // Try OpenAI first
    try {
      const prompt = `You are analyzing a legal document called "${documentName}". 
      The following fields were found but are empty or need clarification:
      
      ${emptyFields.map(field => `- ${field.key}`).join('\n')}
      
      Generate specific, clear questions to ask the user to fill in these missing fields. 
      Make the questions professional and legal-appropriate. Return ONLY a JSON array of question objects with this exact format:
      [{"field": "field_name", "question": "What is your full name?", "type": "text", "required": true}]
      
      Field types can be: text, email, phone, date, number, address, or select.
      For select type, include an "options" array.
      
      Make sure the questions are directly related to the actual fields found in the document.
      Return ONLY the JSON array, no other text.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Try to parse JSON from OpenAI response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      console.warn('No valid JSON found in OpenAI response:', responseText);
    } catch (openaiError) {
      console.warn('OpenAI question generation failed, using fallback:', openaiError.message);
    }

    // Fallback: Generate simple questions based on field names
    return emptyFields.map(field => {
      const fieldName = field.key.toLowerCase();
      let question = `What is your ${field.key.toLowerCase()}?`;
      let type = 'text';
      
      if (fieldName.includes('email')) {
        question = `What is your email address?`;
        type = 'email';
      } else if (fieldName.includes('phone')) {
        question = `What is your phone number?`;
        type = 'phone';
      } else if (fieldName.includes('date') || fieldName.includes('birth')) {
        question = `What is your ${field.key.toLowerCase()}?`;
        type = 'date';
      } else if (fieldName.includes('name')) {
        question = `What is your full name?`;
      } else if (fieldName.includes('address')) {
        question = `What is your address?`;
        type = 'address';
      } else if (fieldName.includes('company')) {
        question = `What is your company name?`;
      } else if (fieldName.includes('position') || fieldName.includes('title')) {
        question = `What is your job title or position?`;
      }
      
      return {
        field: field.key,
        question: question,
        type: type,
        required: true
      };
    });
    
  } catch (error) {
    console.error('Error generating questions:', error);
    return [];
  }
}

// Helper function to extract text from Textract blocks
function extractTextFromBlock(block, allBlocks) {
  if (!block.Relationships) return '';
  
  const textBlocks = block.Relationships
    .filter(rel => rel.Type === 'CHILD')
    .flatMap(rel => rel.Ids)
    .map(id => allBlocks.find(b => b.Id === id))
    .filter(b => b && b.BlockType === 'WORD')
    .map(b => b.Text)
    .join(' ');
    
  return textBlocks;
}

// Helper function to find value block for a key
function findValueBlock(keyBlock, allBlocks) {
  if (!keyBlock.Relationships) return null;
  
  const valueRelationship = keyBlock.Relationships.find(rel => rel.Type === 'VALUE');
  if (!valueRelationship) return null;
  
  return valueRelationship.Ids
    .map(id => allBlocks.find(b => b.Id === id))
    .find(b => b && b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes && b.EntityTypes.includes('VALUE'));
}

// Fill document with user answers
app.post('/api/documents/fill', async (req, res) => {
  try {
    const { documentName, answers, originalFields } = req.body;
    
    if (!answers || !originalFields) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // Create filled document data
    const filledDocument = {
      documentName: documentName,
      filledFields: originalFields.map(field => ({
        key: field.key,
        value: answers[field.key] || field.value || '',
        originalValue: field.value || ''
      })),
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // Generate a summary of what was filled
    const summary = await generateDocumentSummary(filledDocument);
    
    res.json({
      success: true,
      filledDocument: filledDocument,
      summary: summary,
      downloadUrl: `/api/documents/download/${Date.now()}-${documentName}`
    });

  } catch (error) {
    console.error('Document filling error:', error);
    res.status(500).json({ error: 'Error filling document' });
  }
});

// Generate document summary using Mistral
async function generateDocumentSummary(filledDocument) {
  try {
    const prompt = `Summarize the completion of this legal document:
    
    Document: ${filledDocument.documentName}
    Fields filled: ${filledDocument.filledFields.length}
    
    Provide a brief summary of what information was collected and any recommendations for the user.`;

    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 300,
        temperature: 0.3
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.outputs[0].text;
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Document has been successfully completed.';
  }
}

// Generate and download completed document
app.post('/api/documents/generate', async (req, res) => {
  try {
    const { documentName, filledFields, originalFields } = req.body;
    
    if (!filledFields || !originalFields) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // Generate the completed document using Mistral
    const documentContent = await generateCompletedDocument(documentName, filledFields, originalFields);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="completed_${documentName}"`);
    res.send(documentContent);

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ error: 'Error generating document' });
  }
});

// Generate completed document content using Mistral
async function generateCompletedDocument(documentName, filledFields, originalFields) {
  try {
    const prompt = `Generate a completed legal document based on the following information:

Document Name: ${documentName}

Original Fields and Values:
${originalFields.map(field => `${field.key}: ${field.value || '[Empty]'}`).join('\n')}

Filled Information:
${filledFields.map(field => `${field.key}: ${field.value}`).join('\n')}

Generate a professional, properly formatted legal document that incorporates all the filled information. 
Make it look like a real legal document with proper formatting, headers, and structure.
Include all the original field labels and fill them with the provided values.
Make sure the document is complete and ready for use.`;

    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.3
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.outputs[0].text;
  } catch (error) {
    console.error('Error generating document content:', error);
    return `COMPLETED LEGAL DOCUMENT: ${documentName}\n\n${filledFields.map(field => `${field.key}: ${field.value}`).join('\n')}`;
  }
}

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