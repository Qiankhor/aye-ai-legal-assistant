import express from 'express';
import multer from 'multer';
// Import the library implementation directly to avoid index.js debug harness
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { chatbotAiService } from '../services/chatbotAiService.js';

const router = express.Router();

// In-memory session store (simple, replace with Redis/DB in prod)
const sessions = new Map();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Utility to convert buffer to UTF-8 text (basic for txt, fallback for others)
function bufferToUtf8Text(file) {
  try {
    // For plain text, try direct conversion
    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }
    // For other formats, just provide a placeholder note
    // Frontend should pass extracted text when available
    return '[Document binary uploaded. Please provide extracted text for full grounding]';
  } catch (e) {
    return '';
  }
}

async function extractTextFromFile(file) {
  try {
    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(file.buffer);
      return (data.text || '').trim();
    }
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.toLowerCase().endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return (result.value || '').trim();
    }
    // Fallback to placeholder
    return bufferToUtf8Text(file);
  } catch (err) {
    console.warn('Text extraction failed, using placeholder:', err.message);
    return bufferToUtf8Text(file);
  }
}

function getTextSample(text, limit = 200) {
  if (!text) return '';
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

/**
 * Create a new doc-grounded chat session by uploading a document file.
 * Returns sessionId to be used for subsequent chat calls.
 */
router.post('/doc-chat/sessions/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const documentName = req.file.originalname;
    const documentText = await extractTextFromFile(req.file);
    const textLength = documentText ? documentText.length : 0;
    console.log(`[doc-chat] upload session: name=${documentName} type=${req.file.mimetype} size=${req.file.size} textLength=${textLength}`);

    sessions.set(sessionId, {
      documentName,
      documentText,
      history: []
    });

    const resp = { success: true, sessionId, documentName, hasText: textLength > 0 };
    const wantDebug = req.query.debug === '1' || req.body?.debug === true;
    if (wantDebug) {
      resp.debug = { textLength, sample: getTextSample(documentText) };
    }
    res.json(resp);
  } catch (error) {
    console.error('Create upload session error:', error);
    res.status(500).json({ error: 'Error creating upload session' });
  }
});

/**
 * Create a new doc-grounded chat session by providing documentText directly.
 */
router.post('/doc-chat/sessions/text', async (req, res) => {
  try {
    const { documentText, documentName = 'Document' } = req.body;
    if (!documentText || !documentText.trim()) {
      return res.status(400).json({ error: 'documentText is required' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessions.set(sessionId, {
      documentName,
      documentText,
      history: []
    });

    const resp = { success: true, sessionId, documentName, hasText: documentText.length > 0 };
    const wantDebug = req.query.debug === '1' || req.body?.debug === true;
    if (wantDebug) {
      resp.debug = { textLength: documentText.length, sample: getTextSample(documentText) };
    }
    res.json(resp);
  } catch (error) {
    console.error('Create text session error:', error);
    res.status(500).json({ error: 'Error creating text session' });
  }
});

/**
 * Ask a question grounded in the session's document.
 */
router.post('/doc-chat/:sessionId/ask', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question, provider = 'openai' } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const conversationHistory = session.history || [];

    const docLen = session.documentText ? session.documentText.length : 0;
    console.log(`[doc-chat] ask: session=${sessionId} provider=${provider} questionLen=${question.length} docLen=${docLen}`);

    // If doc seems short, log a warning for visibility
    if (docLen < 50) {
      console.warn(`[doc-chat] WARNING: very short documentText (len=${docLen}). Extraction may have failed or PDF is image-based.`);
    }
    let result;
    if (provider === 'bedrock') {
      result = await chatbotAiService.processChatWithBedrockUsingDocument(
        session.documentText,
        question,
        conversationHistory
      );
    } else if (provider === 'openai') {
      result = await chatbotAiService.processChatWithOpenAI4UsingDocument(
        session.documentText,
        question,
        conversationHistory
      );
    } else {
      // Default to OpenAI GPT-4o
      result = await chatbotAiService.processChatWithOpenAI4UsingDocument(
        session.documentText,
        question,
        conversationHistory
      );
    }

    // Update history
    conversationHistory.push({ sender: 'user', text: question });
    conversationHistory.push({ sender: 'bot', text: result.response });
    session.history = conversationHistory;
    sessions.set(sessionId, session);

    const resp = { success: true, ...result };
    const wantDebug = req.query.debug === '1' || req.body?.debug === true;
    if (wantDebug) {
      resp.debug = {
        sessionId,
        providerUsed: result.provider,
        documentName: session.documentName,
        textLength: docLen,
        sample: getTextSample(session.documentText)
      };
    }
    res.json(resp);
  } catch (error) {
    console.error('Doc-grounded ask error:', error);
    res.status(500).json({ error: 'Error processing document-grounded question', details: error.message });
  }
});

/**
 * Summarize current session's document (debug/utility)
 */
router.get('/doc-chat/:sessionId/summarize', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const result = await chatbotAiService.summarizeDocumentIfPresent(session.documentText, session.documentName);
    res.json(result);
  } catch (error) {
    console.error('Doc summarize error:', error);
    res.status(500).json({ error: 'Error summarizing document' });
  }
});

/**
 * Get session info (document name and limited history)
 */
router.get('/doc-chat/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const resp = {
    success: true,
    sessionId,
    documentName: session.documentName,
    history: session.history?.slice(-20) || [],
    hasText: !!(session.documentText && session.documentText.length > 0)
  };
  if (req.query.debug === '1') {
    resp.debug = { textLength: session.documentText?.length || 0, sample: getTextSample(session.documentText) };
  }
  res.json(resp);
});

/**
 * Get the extracted document text for a session
 * - By default returns a preview (first 2000 chars). Use ?full=1 for full text
 */
router.get('/doc-chat/:sessionId/text', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const text = session.documentText || '';
  const full = req.query.full === '1';
  const MAX_PREVIEW = 2000;
  res.json({
    success: true,
    sessionId,
    documentName: session.documentName,
    textLength: text.length,
    hasText: text.length > 0,
    content: full ? text : text.slice(0, MAX_PREVIEW),
    truncated: !full && text.length > MAX_PREVIEW
  });
});

export default router;


