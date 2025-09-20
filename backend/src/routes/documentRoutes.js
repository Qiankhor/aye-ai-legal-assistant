import express from 'express';
import multer from 'multer';
import { documentService } from '../services/documentService.js';

const router = express.Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Upload and analyze document
 */
router.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    // Validate document format
    documentService.validateDocument(req.file);

    // Analyze the document
    const result = await documentService.analyzeDocument(req.file);
    res.json(result);
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ 
      error: error.message || 'Error analyzing document',
      success: false 
    });
  }
});

/**
 * Fill document with user answers
 */
router.post('/fill', async (req, res) => {
  try {
    const { documentName, answers, originalFields } = req.body;
    
    if (!documentName || !answers || !originalFields) {
      return res.status(400).json({ 
        error: 'Missing required data: documentName, answers, and originalFields are required' 
      });
    }

    const result = await documentService.fillDocument(documentName, answers, originalFields);
    res.json(result);
  } catch (error) {
    console.error('Document filling error:', error);
    res.status(500).json({ 
      error: error.message || 'Error filling document',
      success: false 
    });
  }
});

/**
 * Generate and download completed document
 */
router.post('/generate', async (req, res) => {
  try {
    const { documentName, filledFields, originalFields } = req.body;
    
    if (!documentName || !filledFields || !originalFields) {
      return res.status(400).json({ 
        error: 'Missing required data: documentName, filledFields, and originalFields are required' 
      });
    }

    const result = await documentService.generateDocument(documentName, filledFields, originalFields);
    
    if (result.success) {
      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.content);
    } else {
      res.status(500).json({ 
        error: 'Failed to generate document',
        success: false 
      });
    }
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Error generating document',
      success: false 
    });
  }
});

/**
 * Get supported document formats
 */
router.get('/formats', (req, res) => {
  try {
    const formats = [
      { type: 'application/pdf', name: 'PDF', extension: '.pdf' },
      { type: 'application/msword', name: 'Microsoft Word (Legacy)', extension: '.doc' },
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Microsoft Word', extension: '.docx' },
      { type: 'text/plain', name: 'Plain Text', extension: '.txt' }
    ];
    
    res.json({ 
      success: true,
      supportedFormats: formats,
      maxFileSize: '5MB'
    });
  } catch (error) {
    console.error('Error getting supported formats:', error);
    res.status(500).json({ error: 'Error retrieving supported formats' });
  }
});

export default router;
