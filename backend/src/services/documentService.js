import { AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { configService } from '../config/clients.js';
import { aiService } from './aiService.js';

/**
 * Document Service for handling document analysis, processing, and generation
 */
class DocumentService {
  constructor() {
    this.supportedFormats = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    this.mockFormFields = [
      { key: 'Full Name', value: '', confidence: 95 },
      { key: 'Email Address', value: '', confidence: 90 },
      { key: 'Phone Number', value: '', confidence: 85 },
      { key: 'Date of Birth', value: '', confidence: 88 },
      { key: 'Address', value: '', confidence: 92 },
      { key: 'Company Name', value: '', confidence: 87 },
      { key: 'Position/Title', value: '', confidence: 89 },
      { key: 'Signature Date', value: '', confidence: 93 }
    ];
  }

  /**
   * Check if document format is supported
   */
  isSupportedFormat(mimeType) {
    return this.supportedFormats.includes(mimeType);
  }

  /**
   * Analyze document using AWS Textract or fallback to mock data
   */
  async analyzeDocument(file) {
    try {
      if (!file) {
        throw new Error('No document provided');
      }

      console.log('Analyzing document:', file.originalname);

      // Check if AWS is configured and available
      if (!configService.isAWSConfigured()) {
        console.log('AWS credentials not configured, using mock data for testing');
        return await this.generateMockAnalysis(file.originalname);
      }

      try {
        // Use Textract to analyze the document
        const textractClient = configService.getTextractClient();
        
        const analyzeCommand = new AnalyzeDocumentCommand({
          Document: {
            Bytes: file.buffer
          },
          FeatureTypes: ['FORMS', 'TABLES']
        });

        const textractResponse = await textractClient.send(analyzeCommand);
        const keyValuePairs = this.extractFormFields(textractResponse);
        
        return await this.generateAnalysisResult(keyValuePairs, file.originalname);
      } catch (awsError) {
        console.warn('AWS Textract failed, using mock data:', awsError.message);
        return await this.generateMockAnalysis(file.originalname, awsError.message);
      }
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error(`Error analyzing document: ${error.message}`);
    }
  }

  /**
   * Extract form fields from Textract response
   */
  extractFormFields(textractResponse) {
    const keyValuePairs = [];
    
    if (textractResponse.Blocks) {
      for (const block of textractResponse.Blocks) {
        if (block.BlockType === 'KEY_VALUE_SET') {
          if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
            // This is a key
            const keyText = this.extractTextFromBlock(block, textractResponse.Blocks);
            const valueBlock = this.findValueBlock(block, textractResponse.Blocks);
            const valueText = valueBlock ? this.extractTextFromBlock(valueBlock, textractResponse.Blocks) : '';
            
            keyValuePairs.push({
              key: keyText,
              value: valueText,
              confidence: block.Confidence || 0
            });
          }
        }
      }
    }
    
    return keyValuePairs;
  }

  /**
   * Extract text from Textract blocks
   */
  extractTextFromBlock(block, allBlocks) {
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

  /**
   * Find value block for a key
   */
  findValueBlock(keyBlock, allBlocks) {
    if (!keyBlock.Relationships) return null;
    
    const valueRelationship = keyBlock.Relationships.find(rel => rel.Type === 'VALUE');
    if (!valueRelationship) return null;
    
    return valueRelationship.Ids
      .map(id => allBlocks.find(b => b.Id === id))
      .find(b => b && b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes && b.EntityTypes.includes('VALUE'));
  }

  /**
   * Generate analysis result with AI-generated summary and questions
   */
  async generateAnalysisResult(formFields, documentName) {
    try {
      // Generate document summary
      const documentSummary = await aiService.generateDocumentSummary(formFields, documentName);
      
      // Generate questions for empty fields
      const questions = await aiService.generateQuestionsForDocument(formFields, documentName);
      
      return {
        success: true,
        documentName: documentName,
        documentSummary: documentSummary,
        formFields: formFields,
        questions: questions,
        analysis: {
          totalFields: formFields.length,
          emptyFields: formFields.filter(field => !field.value || field.value.trim() === '').length,
          confidence: formFields.length > 0 ? 
            formFields.reduce((acc, field) => acc + field.confidence, 0) / formFields.length : 0
        }
      };
    } catch (error) {
      console.error('Error generating analysis result:', error);
      throw error;
    }
  }

  /**
   * Generate mock analysis for testing when AWS is not available
   */
  async generateMockAnalysis(documentName, errorNote = null) {
    try {
      const documentSummary = await aiService.generateDocumentSummary(this.mockFormFields, documentName);
      const questions = await aiService.generateQuestionsForDocument(this.mockFormFields, documentName);
      
      return {
        success: true,
        documentName: documentName,
        documentSummary: documentSummary,
        formFields: this.mockFormFields,
        questions: questions,
        analysis: {
          totalFields: this.mockFormFields.length,
          emptyFields: this.mockFormFields.filter(field => !field.value || field.value.trim() === '').length,
          confidence: this.mockFormFields.reduce((acc, field) => acc + field.confidence, 0) / this.mockFormFields.length
        },
        note: errorNote ? 
          `Using mock data - ${errorNote}` : 
          'Using mock data - configure AWS credentials for real document analysis'
      };
    } catch (error) {
      console.error('Error generating mock analysis:', error);
      throw error;
    }
  }

  /**
   * Format document analysis for display
   */
  formatDocumentAnalysis(analysis, documentName) {
    return `## 🎉 Document Analysis Complete!

**Document:** ${documentName}

${analysis}

---

## 🚀 Next Steps
Would you like me to help you complete this document? I can guide you through filling in the required information step by step.`;
  }

  /**
   * Fill document with user answers
   */
  async fillDocument(documentName, answers, originalFields) {
    try {
      if (!answers || !originalFields) {
        throw new Error('Missing required data for document filling');
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
      const summary = await this.generateDocumentSummary(filledDocument);
      
      return {
        success: true,
        filledDocument: filledDocument,
        summary: summary,
        downloadUrl: `/api/documents/download/${Date.now()}-${documentName}`
      };
    } catch (error) {
      console.error('Document filling error:', error);
      throw new Error(`Error filling document: ${error.message}`);
    }
  }

  /**
   * Generate document summary using AI
   */
  async generateDocumentSummary(filledDocument) {
    try {
      const prompt = `Summarize the completion of this legal document:
      
      Document: ${filledDocument.documentName}
      Fields filled: ${filledDocument.filledFields.length}
      
      Provide a brief summary of what information was collected and any recommendations for the user.`;

      // Use AI service to generate summary
      return await aiService.generateDocumentSummary(filledDocument.filledFields, filledDocument.documentName);
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Document has been successfully completed.';
    }
  }

  /**
   * Generate completed document
   */
  async generateDocument(documentName, filledFields, originalFields) {
    try {
      if (!filledFields || !originalFields) {
        throw new Error('Missing required data for document generation');
      }

      // Generate the completed document using AI
      const documentContent = await aiService.generateCompletedDocument(documentName, filledFields, originalFields);
      
      return {
        success: true,
        content: documentContent,
        fileName: `completed_${documentName}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Document generation error:', error);
      throw new Error(`Error generating document: ${error.message}`);
    }
  }

  /**
   * Validate document file
   */
  validateDocument(file) {
    if (!file) {
      throw new Error('No document file provided');
    }

    if (!this.isSupportedFormat(file.mimetype)) {
      throw new Error('Unsupported document format. Please upload PDF, DOC, DOCX, or TXT files.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Document file too large. Maximum size is 5MB');
    }

    return true;
  }
}

export const documentService = new DocumentService();
