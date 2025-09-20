import express from 'express';
import { qaService } from '../services/qaService.js';
import { documentService } from '../services/documentService.js';

const router = express.Router();

/**
 * Create a new Q&A session for document completion
 */
router.post('/sessions', async (req, res) => {
  try {
    const { documentData, userId } = req.body;
    
    if (!documentData) {
      return res.status(400).json({ 
        error: 'Document data is required to create Q&A session' 
      });
    }

    const result = await qaService.createSession(documentData, userId);
    res.json(result);
  } catch (error) {
    console.error('Error creating Q&A session:', error);
    res.status(500).json({ 
      error: error.message || 'Error creating Q&A session',
      success: false 
    });
  }
});

/**
 * Get current question for a session
 */
router.get('/sessions/:sessionId/current-question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await qaService.getCurrentQuestion(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error getting current question:', error);
    res.status(500).json({ 
      error: error.message || 'Error getting current question',
      success: false 
    });
  }
});

/**
 * Submit answer to current question
 */
router.post('/sessions/:sessionId/answers', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    if (!answer) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    const result = await qaService.submitAnswer(sessionId, answer);
    res.json(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ 
      error: error.message || 'Error submitting answer',
      success: false 
    });
  }
});

/**
 * Get session progress and status
 */
router.get('/sessions/:sessionId/progress', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await qaService.getSessionProgress(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error getting session progress:', error);
    res.status(500).json({ 
      error: error.message || 'Error getting session progress',
      success: false 
    });
  }
});

/**
 * Complete session and generate document
 */
router.post('/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Complete the Q&A session
    const sessionResult = await qaService.completeSession(sessionId);
    
    if (sessionResult.success) {
      // Generate the completed document
      const documentResult = await documentService.generateDocument(
        sessionResult.documentName,
        sessionResult.filledFields,
        sessionResult.originalFields
      );
      
      if (documentResult.success) {
        // Set headers for file download
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${documentResult.fileName}"`);
        res.send(documentResult.content);
      } else {
        res.status(500).json({ 
          error: 'Failed to generate completed document',
          success: false 
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Failed to complete session',
        success: false 
      });
    }
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ 
      error: error.message || 'Error completing session',
      success: false 
    });
  }
});

/**
 * Cancel/delete a session
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await qaService.cancelSession(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ 
      error: error.message || 'Error cancelling session',
      success: false 
    });
  }
});

/**
 * Get all active sessions (for debugging/monitoring)
 */
router.get('/sessions', async (req, res) => {
  try {
    const activeSessions = await qaService.getActiveSessions();
    res.json({ 
      success: true,
      activeSessions: activeSessions,
      count: activeSessions.length 
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ 
      error: error.message || 'Error getting active sessions',
      success: false 
    });
  }
});

export default router;
