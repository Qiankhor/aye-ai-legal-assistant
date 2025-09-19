import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import speech from '@google-cloud/speech';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
});

// Initialize Google Cloud Speech client
const speechClient = new speech.SpeechClient();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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