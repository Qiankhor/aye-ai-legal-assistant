import express from 'express';
import multer from 'multer';
import { speechService } from '../services/speechService.js';

const router = express.Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Speech to text conversion endpoint
 */
router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const languageCode = req.body.languageCode || 'en-US';
    const result = await speechService.processAudioFile(req.file, languageCode);

    if (result.success) {
      res.json({
        transcription: result.transcription,
        confidence: result.confidence,
        languageCode: result.languageCode,
        timestamp: result.timestamp
      });
    } else {
      res.status(400).json({
        error: result.error,
        fileName: result.fileName
      });
    }
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ error: 'Error processing audio' });
  }
});

/**
 * Get supported languages for speech recognition
 */
router.get('/speech-languages', (req, res) => {
  try {
    const languages = speechService.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Error getting supported languages:', error);
    res.status(500).json({ error: 'Error retrieving supported languages' });
  }
});

export default router;
