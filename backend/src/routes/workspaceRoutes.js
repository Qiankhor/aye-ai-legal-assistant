import express from 'express';
import AWS from 'aws-sdk';

const router = express.Router();

// Configure AWS
const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

// Lambda function names
const TODO_LAMBDA_FUNCTION = process.env.TODO_LAMBDA_FUNCTION || 'todolist-handler';
const DOCUMENT_LAMBDA_FUNCTION = process.env.DOCUMENT_LAMBDA_FUNCTION || 'document-storage-handler';
const EMAIL_LAMBDA_FUNCTION = process.env.EMAIL_LAMBDA_FUNCTION || 'email-handler';
const LEGAL_ANALYZER_FUNCTION = process.env.LEGAL_ANALYZER_FUNCTION || 'legal-analyzer-handler';
const LEGAL_AGENT_FUNCTION = process.env.LEGAL_AGENT_FUNCTION || 'legal-agent-interface';

// Import shared storage and helper functions
import { 
  todos, files, todoIdCounter, fileIdCounter, 
  createTodoDirectly, getTodos, updateTodo, deleteTodo,
  createFileDirectly, getFiles, getFileById, deleteFile
} from './workspaceHelpers.js';

/**
 * Todo Management Routes
 */

// Get all todos for a user
router.get('/todos', async (req, res) => {
  try {
    const { emailAddress = 'default@example.com' } = req.query;
    
    // Use shared helper function
    const userTodos = getTodos(emailAddress);
    
    res.json({
      success: true,
      todos: userTodos
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch todos'
    });
  }
});

// Create a new todo
router.post('/todos', async (req, res) => {
  try {
    const { 
      taskDescription, 
      emailAddress = 'default@example.com',
      emailContext = 'User created task',
      documentTitle = 'General Task',
      dueDate 
    } = req.body;

    if (!taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'Task description is required'
      });
    }

    // Use shared helper function to create todo
    const newTodo = await createTodoDirectly({
      taskDescription,
      emailAddress,
      emailContext,
      documentTitle,
      dueDate
    });

    // Optionally call Lambda function for persistence
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.TODO_LAMBDA_FUNCTION) {
        const lambdaParams = {
          FunctionName: TODO_LAMBDA_FUNCTION,
          Payload: JSON.stringify({
            actionGroup: 'TodoActionGroup',
            function: 'addTodo',
            messageVersion: '1',
            parameters: [
              { name: 'emailAddress', value: emailAddress },
              { name: 'taskDescription', value: taskDescription },
              { name: 'emailContext', value: emailContext },
              { name: 'documentTitle', value: documentTitle },
              { name: 'status', value: 'pending' }
            ]
          })
        };
        
        await lambda.invoke(lambdaParams).promise();
        console.log('Todo saved to Lambda/DynamoDB');
      }
    } catch (lambdaError) {
      console.warn('Lambda call failed, using in-memory storage:', lambdaError.message);
    }

    res.json({
      success: true,
      todo: newTodo,
      message: 'Todo created successfully'
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create todo'
    });
  }
});

// Update todo status
router.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, status } = req.body;

    // Find and update todo in memory
    const todoIndex = todos.findIndex(todo => todo.id === parseInt(id));
    if (todoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    // Update todo
    todos[todoIndex] = {
      ...todos[todoIndex],
      completed: completed !== undefined ? completed : todos[todoIndex].completed,
      status: status || (completed ? 'completed' : 'pending'),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Todo updated successfully',
      todo: todos[todoIndex]
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update todo'
    });
  }
});

// Delete todo
router.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and remove todo from memory
    const todoIndex = todos.findIndex(todo => todo.id === parseInt(id));
    if (todoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    // Remove todo
    todos.splice(todoIndex, 1);

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete todo'
    });
  }
});

/**
 * File Management Routes
 */

// Get all files for a user
router.get('/files', async (req, res) => {
  try {
    const { documentType } = req.query;

    // Use shared helper function
    const filteredFiles = getFiles(documentType);

    res.json({
      success: true,
      files: filteredFiles,
      count: filteredFiles.length
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files'
    });
  }
});

// Upload/save a new file
router.post('/files', async (req, res) => {
  try {
    const { 
      documentName,
      documentContent,
      documentType = 'legal_document',
      analysisResults = 'No analysis performed'
    } = req.body;

    if (!documentName || !documentContent) {
      return res.status(400).json({
        success: false,
        error: 'Document name and content are required'
      });
    }

    // Use shared helper function to create file
    const newFile = await createFileDirectly({
      documentName,
      documentContent,
      documentType,
      analysisResults
    });

    // Optionally call Lambda function for persistence
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.DOCUMENT_LAMBDA_FUNCTION) {
        const lambdaParams = {
          FunctionName: DOCUMENT_LAMBDA_FUNCTION,
          Payload: JSON.stringify({
            actionGroup: 'DocumentStorageActionGroup',
            function: 'saveDocument',
            messageVersion: '1',
            parameters: [
              { name: 'documentName', value: documentName },
              { name: 'documentContent', value: documentContent },
              { name: 'documentType', value: documentType },
              { name: 'analysisResults', value: analysisResults }
            ]
          })
        };
        
        await lambda.invoke(lambdaParams).promise();
        console.log('File saved to Lambda/Storage');
      }
    } catch (lambdaError) {
      console.warn('Lambda call failed, using in-memory storage:', lambdaError.message);
    }

    // Return file without content to avoid large responses
    const { content, ...fileResponse } = newFile;

    res.json({
      success: true,
      file: fileResponse,
      message: 'File saved successfully'
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save file'
    });
  }
});

// Get specific file
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Use shared helper function
    const file = getFileById(id);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      file: file
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file'
    });
  }
});

// Delete file
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Use shared helper function
    const deleted = deleteFile(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

/**
 * Email Management Routes
 */

// Send email
router.post('/send-email', async (req, res) => {
  try {
    const { 
      recipientEmail,
      subject,
      body,
      documentTitle,
      emailContext = 'Workspace email'
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required'
      });
    }

    if (!subject && !body) {
      return res.status(400).json({
        success: false,
        error: 'Either subject or body is required'
      });
    }

    // Call email Lambda function
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.EMAIL_LAMBDA_FUNCTION) {
        const lambdaParams = {
          FunctionName: EMAIL_LAMBDA_FUNCTION,
          Payload: JSON.stringify({
            actionGroup: 'EmailActionGroup',
            function: 'sendEmail',
            messageVersion: '1',
            parameters: [
              { name: 'recipientEmail', value: recipientEmail },
              { name: 'subject', value: subject || '' },
              { name: 'body', value: body || '' },
              { name: 'documentTitle', value: documentTitle || '' },
              { name: 'emailContext', value: emailContext }
            ]
          })
        };
        
        const lambdaResponse = await lambda.invoke(lambdaParams).promise();
        const responsePayload = JSON.parse(lambdaResponse.Payload);
        
        if (responsePayload.response && responsePayload.response.functionResponse) {
          const emailResult = responsePayload.response.functionResponse.responseBody.TEXT.body;
          
          res.json({
            success: true,
            message: emailResult,
            emailSent: true
          });
        } else {
          throw new Error('Invalid Lambda response format');
        }
      } else {
        // Fallback for development without AWS credentials
        console.warn('AWS not configured, simulating email send');
        res.json({
          success: true,
          message: `Email would be sent to ${recipientEmail}`,
          emailSent: false,
          simulation: true,
          details: {
            to: recipientEmail,
            subject: subject || `Re: ${documentTitle || 'Workspace Notification'}`,
            body: body || `Email content for ${emailContext}`,
            documentTitle
          }
        });
      }
    } catch (lambdaError) {
      console.error('Email Lambda error:', lambdaError);
      res.status(500).json({
        success: false,
        error: 'Failed to send email via Lambda function',
        details: lambdaError.message
      });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

/**
 * Advanced Legal Agent Integration
 */

// Advanced legal consultation using Bedrock agent
router.post('/ai/legal-consultation', async (req, res) => {
  try {
    const { 
      query, 
      documentContext = null, 
      consultationType = 'general',
      sessionId = null 
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required for legal consultation'
      });
    }

    // Try advanced legal agent interface
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.LEGAL_AGENT_FUNCTION) {
        const lambdaParams = {
          FunctionName: LEGAL_AGENT_FUNCTION,
          Payload: JSON.stringify({
            action: 'legal_consultation',
            query: query,
            documentContext: documentContext,
            consultationType: consultationType,
            sessionId: sessionId || `session_${Date.now()}`,
            timestamp: new Date().toISOString()
          })
        };
        
        const lambdaResponse = await lambda.invoke(lambdaParams).promise();
        const responsePayload = JSON.parse(lambdaResponse.Payload);
        
        if (responsePayload.statusCode === 200) {
          const consultation = JSON.parse(responsePayload.body);
          
          res.json({
            success: true,
            consultation: consultation,
            provider: 'legal-agent-interface',
            message: 'Legal consultation completed'
          });
        } else {
          throw new Error('Legal agent consultation failed');
        }
      } else {
        throw new Error('Legal agent not configured');
      }
    } catch (lambdaError) {
      console.warn('Advanced legal agent failed, using fallback:', lambdaError.message);
      
      // Fallback to simple legal guidance
      const fallbackConsultation = {
        query: query,
        response: `Based on your query about "${query}", I recommend consulting with a qualified attorney for specific legal advice. This appears to be a ${consultationType} legal matter that requires professional review.`,
        recommendations: [
          'Consult with a qualified attorney',
          'Review relevant legal documentation',
          'Consider jurisdiction-specific requirements'
        ],
        confidence: 0.6,
        provider: 'fallback-guidance',
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        consultation: fallbackConsultation,
        provider: 'fallback-guidance',
        message: 'Basic legal guidance provided'
      });
    }
  } catch (error) {
    console.error('Error in legal consultation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to provide legal consultation'
    });
  }
});

// Advanced document risk assessment
router.post('/ai/risk-assessment', async (req, res) => {
  try {
    const { fileId, riskCategories = ['general'] } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required for risk assessment'
      });
    }

    // Find the file
    const file = files.find(f => f.id === parseInt(fileId));
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Try advanced legal analyzer for risk assessment
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.LEGAL_ANALYZER_FUNCTION) {
        const lambdaParams = {
          FunctionName: LEGAL_ANALYZER_FUNCTION,
          Payload: JSON.stringify({
            actionGroup: 'LegalAnalyzerActionGroup',
            function: 'generateRiskReport',
            messageVersion: '1',
            parameters: [
              { name: 'documentId', value: fileId.toString() },
              { name: 'riskCategories', value: riskCategories.join(',') }
            ]
          })
        };
        
        const lambdaResponse = await lambda.invoke(lambdaParams).promise();
        const responsePayload = JSON.parse(lambdaResponse.Payload);
        
        if (responsePayload.response && responsePayload.response.functionResponse) {
          const riskReport = responsePayload.response.functionResponse.responseBody.TEXT.body;
          
          res.json({
            success: true,
            riskAssessment: {
              fileId: fileId,
              fileName: file.name,
              riskReport: riskReport,
              riskCategories: riskCategories,
              provider: 'legal-analyzer-lambda',
              confidence: 0.9,
              assessedAt: new Date().toISOString()
            },
            message: 'Risk assessment completed'
          });
        } else {
          throw new Error('Invalid risk assessment response');
        }
      } else {
        throw new Error('Legal analyzer not configured');
      }
    } catch (lambdaError) {
      console.warn('Advanced risk assessment failed, using fallback:', lambdaError.message);
      
      // Fallback risk assessment
      const fallbackRisk = {
        fileId: fileId,
        fileName: file.name,
        riskLevel: 'Medium',
        riskFactors: [
          'Document requires legal review',
          'Potential compliance considerations',
          'Standard legal document risks apply'
        ],
        recommendations: [
          'Have legal expert review the document',
          'Verify compliance with applicable laws',
          'Consider jurisdiction-specific requirements'
        ],
        provider: 'fallback-assessment',
        confidence: 0.6,
        assessedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        riskAssessment: fallbackRisk,
        message: 'Basic risk assessment completed'
      });
    }
  } catch (error) {
    console.error('Error in risk assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform risk assessment'
    });
  }
});

/**
 * AI Integration for Workspace
 */

// AI-powered task generation
router.post('/ai/generate-tasks', async (req, res) => {
  try {
    const { context, documentTitle, priority = 'medium' } = req.body;

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'Context is required for task generation'
      });
    }

    // Generate contextual tasks based on input
    const aiGeneratedTasks = [];
    
    // Add context-specific tasks
    if (context.toLowerCase().includes('contract')) {
      aiGeneratedTasks.push({
        task: `Review contract terms and conditions for ${documentTitle || 'the document'}`,
        priority: 'high',
        estimatedTime: '2-3 hours',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    if (context.toLowerCase().includes('compliance')) {
      aiGeneratedTasks.push({
        task: `Conduct compliance review for ${documentTitle || 'the document'}`,
        priority: 'high',
        estimatedTime: '1-2 hours',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    // Always add a general review task
    aiGeneratedTasks.push({
      task: `Review and analyze ${documentTitle || 'the document'} for legal issues`,
      priority: priority,
      estimatedTime: '1-2 hours',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    
    // Add follow-up task
    aiGeneratedTasks.push({
      task: `Prepare summary report for ${context}`,
      priority: 'medium',
      estimatedTime: '30-60 minutes',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    res.json({
      success: true,
      suggestedTasks: aiGeneratedTasks,
      message: 'AI-generated task suggestions ready'
    });
  } catch (error) {
    console.error('Error generating AI tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI tasks'
    });
  }
});

// AI file analysis with advanced legal analyzer
router.post('/ai/analyze-file', async (req, res) => {
  try {
    const { fileId, analysisType = 'comprehensive' } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required for analysis'
      });
    }

    // Find the file to analyze
    const file = files.find(f => f.id === parseInt(fileId));
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    let analysisResult;

    // Try advanced legal analyzer first
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.LEGAL_ANALYZER_FUNCTION) {
        const lambdaParams = {
          FunctionName: LEGAL_ANALYZER_FUNCTION,
          Payload: JSON.stringify({
            actionGroup: 'LegalAnalyzerActionGroup',
            function: 'analyzeDocument',
            messageVersion: '1',
            parameters: [
              { name: 'documentText', value: file.content || 'Document content not available' },
              { name: 'documentTitle', value: file.name },
              { name: 'analysisType', value: analysisType }
            ]
          })
        };
        
        const lambdaResponse = await lambda.invoke(lambdaParams).promise();
        const responsePayload = JSON.parse(lambdaResponse.Payload);
        
        if (responsePayload.response && responsePayload.response.functionResponse) {
          const legalAnalysis = responsePayload.response.functionResponse.responseBody.TEXT.body;
          
          analysisResult = {
            fileId: fileId,
            fileName: file.name,
            analysisType: analysisType,
            advancedAnalysis: legalAnalysis,
            analysisProvider: 'legal-analyzer-lambda',
            confidence: 0.95,
            analyzedAt: new Date().toISOString()
          };
        } else {
          throw new Error('Invalid legal analyzer response');
        }
      } else {
        throw new Error('Legal analyzer not configured');
      }
    } catch (lambdaError) {
      console.warn('Advanced legal analyzer failed, using fallback:', lambdaError.message);
      
      // Fallback to simple analysis
      analysisResult = {
        fileId: fileId,
        fileName: file.name,
        analysisType: analysisType,
        summary: generateFileSummary(file),
        keyPoints: generateKeyPoints(file),
        riskAssessment: generateRiskAssessment(file),
        recommendations: generateRecommendations(file),
        analysisProvider: 'simple-fallback',
        confidence: 0.75,
        analyzedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      analysis: analysisResult,
      message: 'File analysis completed'
    });
  } catch (error) {
    console.error('Error analyzing file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze file'
    });
  }
});

// Helper functions for AI analysis
function generateFileSummary(file) {
  const fileName = file.name.toLowerCase();
  if (fileName.includes('nda') || fileName.includes('non-disclosure')) {
    return 'This appears to be a Non-Disclosure Agreement (NDA) document containing confidentiality provisions.';
  } else if (fileName.includes('contract') || fileName.includes('agreement')) {
    return 'This document appears to be a legal contract or agreement with terms and conditions.';
  } else if (fileName.includes('policy')) {
    return 'This document appears to be a policy document outlining procedures and guidelines.';
  } else {
    return `This document (${file.name}) appears to be a ${file.documentType} with legal content.`;
  }
}

function generateKeyPoints(file) {
  const fileName = file.name.toLowerCase();
  if (fileName.includes('nda')) {
    return [
      'Confidentiality obligations defined',
      'Duration of confidentiality specified',
      'Permitted disclosures outlined'
    ];
  } else if (fileName.includes('contract')) {
    return [
      'Terms and conditions specified',
      'Payment terms included',
      'Termination clauses present'
    ];
  } else {
    return [
      'Document structure appears standard',
      'Legal language used throughout',
      'Key provisions identified'
    ];
  }
}

function generateRiskAssessment(file) {
  const fileName = file.name.toLowerCase();
  if (fileName.includes('draft') || fileName.includes('temp')) {
    return 'Medium risk - Document appears to be in draft form and may require review';
  } else {
    return 'Low to medium risk - Standard legal document structure observed';
  }
}

function generateRecommendations(file) {
  const fileName = file.name.toLowerCase();
  const recommendations = ['Review document for completeness'];
  
  if (fileName.includes('contract')) {
    recommendations.push('Verify all parties are properly identified');
    recommendations.push('Confirm payment terms are acceptable');
  }
  
  if (fileName.includes('nda')) {
    recommendations.push('Review confidentiality scope and duration');
    recommendations.push('Ensure mutual obligations are balanced');
  }
  
  recommendations.push('Consider legal review before execution');
  return recommendations;
}

export default router;
