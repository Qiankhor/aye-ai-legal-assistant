import express from 'express';
import { aiService } from '../services/aiService.js';

const router = express.Router();

/**
 * Chat endpoint using OpenAI
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiService.processChatWithOpenAI(message, conversationHistory);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error processing chat request' });
  }
});

/**
 * Chat endpoint using AWS Bedrock
 */
router.post('/chat-bedrock', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiService.processChatWithBedrock(message, conversationHistory);
    res.json(result);
  } catch (error) {
    console.error('Bedrock chat error:', error);
    res.status(500).json({ error: 'Error processing Bedrock chat request' });
  }
});

export default router;
