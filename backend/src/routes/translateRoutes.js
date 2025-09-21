import express from 'express';
import { configService } from '../config/clients.js';

const router = express.Router();

/**
 * POST /api/translate
 * Body: { text: string, targetLanguage: string }
 * Detects source language and translates to target language via OpenAI.
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body || {};

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Both text and targetLanguage are required' });
    }

    const openai = configService.getOpenAIClient();

    const messages = [
      {
        role: 'system',
        content:
          'You are a translation assistant. Detect the source language and translate the user-provided text into the specified target language. Respond with ONLY the translated text, no explanations.'
      },
      {
        role: 'user',
        content: `Target language: ${targetLanguage}\nText: ${text}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.2
    });

    const translatedText = (completion.choices?.[0]?.message?.content || '').trim();
    return res.json({ translatedText });
  } catch (error) {
    console.error('Translate error:', error);
    return res.status(500).json({ error: 'Error translating text' });
  }
});

export default router;


