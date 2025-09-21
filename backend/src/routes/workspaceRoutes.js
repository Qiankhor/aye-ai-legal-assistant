import express from 'express';
import AWS from 'aws-sdk';
import { MongoClient, GridFSBucket } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Configure AWS DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Configure MongoDB
let MONGODB_URI = process.env.MONGODB_URI;
let mongoClient = null;
let mongoDb = null;

// Clean up MongoDB URI for Node.js driver compatibility
if (MONGODB_URI) {
  // Remove Python-specific SSL parameters that Node.js doesn't support
  MONGODB_URI = MONGODB_URI.replace(/&ssl_cert_reqs=CERT_NONE/g, '');
  MONGODB_URI = MONGODB_URI.replace(/&ssl=true/g, '');
  
  // Add database name if not present
  if (!MONGODB_URI.includes('/legal-assistant?')) {
    MONGODB_URI = MONGODB_URI.replace('mongodb.net/', 'mongodb.net/legal-assistant');
  }
}

async function getMongoConnection() {
  if (!mongoClient) {
    try {
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db('legal-assistant');
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }
  return { client: mongoClient, db: mongoDb };
}

// DynamoDB table names (same as your Lambda functions)
const TODO_TABLE = 'toDoList';
const DOCUMENT_COLLECTION = 'documents';

/**
 * Todo Management Routes
 */

// Get all todos for a user from DynamoDB
router.get('/todos', async (req, res) => {
  try {
    const { emailAddress = 'default@example.com' } = req.query;
    
    console.log(`📋 Fetching todos from DynamoDB for: ${emailAddress}`);
    
    // Query DynamoDB table (same table your Lambda functions use)
    const params = {
      TableName: TODO_TABLE,
      FilterExpression: 'emailAddress = :email',
      ExpressionAttributeValues: {
        ':email': emailAddress
      }
    };
    
    // Perform scan with pagination to get all items
    let allItems = [];
    let lastEvaluatedKey = null;
    
    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await dynamodb.scan(params).promise();
      allItems = allItems.concat(result.Items || []);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    // Transform DynamoDB items to match frontend format
    const todos = allItems.map(item => ({
      id: item.id || item.taskId,
      task: item.task || item.taskDescription, // Use 'task' field first, fallback to 'taskDescription'
      completed: item.completed || item.status === 'completed',
      dueDate: item.dueDate || new Date().toISOString().split('T')[0],
      status: item.status || 'pending',
      emailAddress: item.emailAddress,
      emailContext: item.emailContext,
      documentTitle: item.documentTitle,
      createdAt: item.createdAt || new Date().toISOString()
    }));
    
    console.log(`✅ Found ${todos.length} todos in DynamoDB`);
    
    res.json({
      success: true,
      todos: todos
    });
  } catch (error) {
    console.error('❌ Error fetching todos from DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch todos from database'
    });
  }
});

// Create a new todo in DynamoDB
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

    console.log(`📝 Creating todo in DynamoDB: ${taskDescription}`);

    // Generate unique ID
    const todoId = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create todo item (same structure as Lambda function)
    const todoItem = {
      id: todoId,
      taskDescription: taskDescription,
      emailAddress: emailAddress,
      emailContext: emailContext,
      documentTitle: documentTitle,
      status: 'pending',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Save to DynamoDB
    const params = {
      TableName: TODO_TABLE,
      Item: todoItem
    };

    await dynamodb.put(params).promise();

    // Transform for frontend response
    const responseItem = {
      id: todoItem.id,
      task: todoItem.taskDescription,
      completed: false,
      dueDate: todoItem.dueDate,
      status: todoItem.status,
      emailAddress: todoItem.emailAddress,
      emailContext: todoItem.emailContext,
      documentTitle: todoItem.documentTitle,
      createdAt: todoItem.createdAt
    };

    res.json({
      success: true,
      todo: responseItem,
      message: 'Todo created successfully in DynamoDB'
    });
  } catch (error) {
    console.error('❌ Error creating todo in DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create todo in database'
    });
  }
});

// Update todo status in DynamoDB
router.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, status } = req.body;

    console.log(`📝 Updating todo in DynamoDB: ${id}`);

    // Determine the status based on completed flag
    const newStatus = completed ? 'completed' : (status || 'pending');

    // Update in DynamoDB
    const params = {
      TableName: TODO_TABLE,
      Key: { id: id },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': newStatus
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();

    if (result.Attributes) {
      // Transform for frontend response
      const updatedTodo = {
        id: result.Attributes.id,
        task: result.Attributes.taskDescription,
        completed: result.Attributes.status === 'completed',
        dueDate: result.Attributes.dueDate,
        status: result.Attributes.status,
        emailAddress: result.Attributes.emailAddress,
        emailContext: result.Attributes.emailContext,
        documentTitle: result.Attributes.documentTitle,
        createdAt: result.Attributes.createdAt
      };

      console.log(`✅ Todo updated in DynamoDB: ${id}`);

      res.json({
        success: true,
        todo: updatedTodo,
        message: 'Todo updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }
  } catch (error) {
    console.error('❌ Error updating todo in DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update todo in database'
    });
  }
});

// Delete todo from DynamoDB
router.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting todo from DynamoDB: ${id}`);

    // Delete from DynamoDB
    const params = {
      TableName: TODO_TABLE,
      Key: { id: id },
      ReturnValues: 'ALL_OLD'
    };

    const result = await dynamodb.delete(params).promise();

    if (result.Attributes) {
      console.log(`✅ Todo deleted from DynamoDB: ${id}`);
      res.json({
        success: true,
        message: 'Todo deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }
  } catch (error) {
    console.error('❌ Error deleting todo from DynamoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete todo from database'
    });
  }
});

/**
 * File Management Routes
 */

// Get all files from MongoDB
router.get('/files', async (req, res) => {
  try {
    const { documentType } = req.query;

    console.log(`📁 Fetching files from MongoDB${documentType ? ` (type: ${documentType})` : ''}`);

    const { db } = await getMongoConnection();
    
    // Build query filter
    const filter = { status: 'active' };
    if (documentType) {
      filter.documentType = documentType;
    }
    
    // Get files from documents collection (has better metadata)
    const documents = await db.collection('documents').find(filter).toArray();
    
    // Transform for frontend
    const transformedFiles = documents.map(doc => ({
      id: doc.documentId,
      name: doc.documentName,
      size: doc.fileSize > 1024 * 1024 
        ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(doc.fileSize / 1024)} KB`,
      sizeBytes: doc.fileSize,
      type: doc.documentName.split('.').pop().toLowerCase(),
      date: doc.uploadDate.toISOString().split('T')[0],
      documentType: doc.documentType,
      analysisResults: doc.analysisResults,
      status: doc.status,
      gridfsId: doc.gridfsFileId?.toString()
    }));

    console.log(`✅ Found ${transformedFiles.length} files in MongoDB`);

    res.json({
      success: true,
      files: transformedFiles,
      count: transformedFiles.length
    });
  } catch (error) {
    console.error('❌ Error fetching files from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files from database'
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

    console.log(`📁 Saving file to MongoDB: ${documentName}`);

    // Get MongoDB connection
    const { db } = await getMongoConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });

    // Handle different content types
    let fileBuffer;
    if (typeof documentContent === 'string') {
      if (documentContent.startsWith('data:')) {
        // Base64 encoded file (from file upload)
        const base64Data = documentContent.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Plain text content
        fileBuffer = Buffer.from(documentContent, 'utf-8');
      }
    } else {
      fileBuffer = Buffer.from(documentContent);
    }

    // Generate unique document ID
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create upload stream to GridFS
    const uploadStream = bucket.openUploadStream(documentName, {
      metadata: {
        documentId: documentId,
        documentType: documentType,
        uploadDate: new Date(),
        analysisResults: analysisResults,
        status: 'active',
        originalSize: fileBuffer.length
      }
    });

    // Save file to GridFS
    await new Promise((resolve, reject) => {
      uploadStream.end(fileBuffer);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    console.log(`✅ File saved to MongoDB GridFS with ID: ${uploadStream.id}`);

    // Also save metadata to documents collection for easier querying
    await db.collection('documents').insertOne({
      documentId: documentId,
      documentName: documentName,
      documentType: documentType,
      gridfsFileId: uploadStream.id,
      uploadDate: new Date(),
      analysisResults: analysisResults,
      status: 'active',
      fileSize: fileBuffer.length
    });

    // Return file info for frontend
    const fileResponse = {
      id: documentId,
      name: documentName,
      type: documentName.split('.').pop().toLowerCase(),
      size: fileBuffer.length > 1024 * 1024 
        ? `${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB`
        : `${(fileBuffer.length / 1024).toFixed(1)} KB`,
      sizeBytes: fileBuffer.length,
      date: new Date().toISOString().split('T')[0],
      documentType: documentType,
      status: 'active',
      createdAt: new Date().toISOString(),
      analysisResults: analysisResults,
      gridfsId: uploadStream.id.toString()
    };

    res.json({
      success: true,
      file: fileResponse,
      message: 'File saved successfully to MongoDB'
    });
  } catch (error) {
    console.error('❌ Error saving file to MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save file to database'
    });
  }
});

// Get specific file metadata and content
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { includeContent } = req.query; // Optional query parameter to include content

    console.log(`📄 Fetching file ${includeContent ? 'with content' : 'metadata'} for ID: ${id}`);

    const { db } = await getMongoConnection();
    
    // Find document by documentId
    const document = await db.collection('documents').findOne({ 
      documentId: id,
      status: 'active'
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Transform for frontend
    const fileResponse = {
      id: document.documentId,
      name: document.documentName,
      size: document.fileSize > 1024 * 1024 
        ? `${(document.fileSize / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(document.fileSize / 1024)} KB`,
      sizeBytes: document.fileSize,
      type: document.documentName.split('.').pop().toLowerCase(),
      date: document.uploadDate.toISOString().split('T')[0],
      documentType: document.documentType,
      analysisResults: document.analysisResults,
      status: document.status,
      gridfsId: document.gridfsFileId?.toString()
    };

    // Include file content if requested
    if (includeContent === 'true' && document.gridfsFileId) {
      try {
        const bucket = new GridFSBucket(db, { bucketName: 'fs' });
        
        // Get file content as buffer
        const chunks = [];
        const downloadStream = bucket.openDownloadStream(document.gridfsFileId);
        
        await new Promise((resolve, reject) => {
          downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          downloadStream.on('end', () => {
            resolve();
          });
          
          downloadStream.on('error', (error) => {
            reject(error);
          });
        });
        
        // Convert to base64
        const fileBuffer = Buffer.concat(chunks);
        const base64Content = fileBuffer.toString('base64');
        
        // Determine MIME type
        let mimeType = 'application/octet-stream';
        const extension = document.documentName.split('.').pop().toLowerCase();
        if (extension === 'pdf') {
          mimeType = 'application/pdf';
        } else if (extension === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (extension === 'doc') {
          mimeType = 'application/msword';
        } else if (extension === 'txt') {
          mimeType = 'text/plain';
        }
        
        // Add content as data URL
        fileResponse.content = `data:${mimeType};base64,${base64Content}`;
        
        console.log(`✅ File content included (${base64Content.length} base64 chars)`);
      } catch (contentError) {
        console.error('❌ Error fetching file content from GridFS:', contentError);
        // Don't fail the entire request, just log the error
        fileResponse.contentError = 'Failed to fetch file content';
      }
    }

    res.json({
      success: true,
      file: fileResponse
    });
  } catch (error) {
    console.error('❌ Error fetching file from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file from database'
    });
  }
});

// Download file content
router.get('/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`⬇️ Downloading file content for ID: ${id}`);

    const { db } = await getMongoConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    // Find document metadata
    const document = await db.collection('documents').findOne({ 
      documentId: id,
      status: 'active'
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set response headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.documentName}"`
    });

    // Stream file from GridFS
    const downloadStream = bucket.openDownloadStream(document.gridfsFileId);
    
    downloadStream.on('error', (error) => {
      console.error('❌ Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('❌ Error downloading file from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file from database'
    });
  }
});

// Delete file
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting file with ID: ${id}`);

    const { db } = await getMongoConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    // Find document metadata
    const document = await db.collection('documents').findOne({ 
      documentId: id,
      status: 'active'
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete from GridFS
    await bucket.delete(document.gridfsFileId);
    
    // Mark as deleted in documents collection (soft delete)
    await db.collection('documents').updateOne(
      { documentId: id },
      { 
        $set: { 
          status: 'deleted',
          deletedAt: new Date()
        }
      }
    );

    console.log(`✅ File deleted successfully: ${document.documentName}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting file from MongoDB:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file from database'
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
      emailContext = 'Workspace email',
      attachFile = false  // New parameter to control file attachment
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

    console.log(`📧 Sending email to ${recipientEmail} with document: ${documentTitle || 'none'} (attach: ${attachFile})`);

    // If documentTitle is provided, try to fetch the document from MongoDB
    let documentInfo = null;
    if (documentTitle) {
      try {
        const { db } = await getMongoConnection();
        
        // Search for document by name (case-insensitive)
        const document = await db.collection('documents').findOne({
          documentName: { $regex: new RegExp(documentTitle, 'i') },
          status: 'active'
        });

        if (document) {
          documentInfo = {
            id: document.documentId,
            name: document.documentName,
            type: document.documentType,
            size: document.fileSize,
            uploadDate: document.uploadDate,
            analysisResults: document.analysisResults,
            gridfsFileId: document.gridfsFileId
          };
          console.log(`📄 Found document in MongoDB: ${document.documentName}`);
          
          if (attachFile) {
            console.log(`📎 File will be attached to email: ${document.documentName}`);
          }
        } else {
          console.log(`⚠️ Document not found in MongoDB: ${documentTitle}`);
        }
      } catch (mongoError) {
        console.warn('MongoDB lookup failed:', mongoError.message);
      }
    }

    // Enhance email body with document information if available
    let enhancedBody = body;
    if (documentInfo && body) {
      enhancedBody = `${body}\n\n--- Document Information ---\nDocument: ${documentInfo.name}\nType: ${documentInfo.type}\nSize: ${Math.round(documentInfo.size / 1024)} KB\nUploaded: ${documentInfo.uploadDate.toISOString().split('T')[0]}\n\nAnalysis: ${documentInfo.analysisResults}`;
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
              { name: 'body', value: enhancedBody || '' },
              { name: 'documentTitle', value: documentTitle || '' },
              { name: 'emailContext', value: emailContext },
              { name: 'attachFile', value: attachFile ? 'true' : 'false' }
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
            emailSent: true,
            documentInfo: documentInfo
          });
        } else {
          throw new Error('Invalid Lambda response format');
        }
      } else {
        // Fallback for development without AWS credentials
        console.warn('AWS not configured, simulating email send');
        const attachmentInfo = (attachFile && documentInfo) ? ` with attachment ${documentInfo.name}` : 
                              documentInfo ? ` with document info ${documentInfo.name}` : '';
        
        res.json({
          success: true,
          message: `Email simulated: To ${recipientEmail}${attachmentInfo}`,
          emailSent: false,
          simulation: true,
          details: {
            to: recipientEmail,
            subject: subject || `Re: ${documentTitle || 'Workspace Notification'}`,
            body: enhancedBody || `Email content for ${emailContext}`,
            documentTitle,
            documentInfo,
            attachFile: attachFile
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

// Send email with file attachment (enhanced version)
router.post('/send-email-with-attachment', async (req, res) => {
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

    if (!documentTitle) {
      return res.status(400).json({
        success: false,
        error: 'Document title is required for attachment'
      });
    }

    console.log(`📎 Sending email with attachment to ${recipientEmail}: ${documentTitle}`);

    // Get MongoDB connection and file
    const { db } = await getMongoConnection();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    
    // Find document
    const document = await db.collection('documents').findOne({
      documentName: { $regex: new RegExp(documentTitle, 'i') },
      status: 'active'
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document not found: ${documentTitle}`
      });
    }

    // Get file content from GridFS
    const downloadStream = bucket.openDownloadStream(document.gridfsFileId);
    const chunks = [];
    
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        const fileBase64 = fileBuffer.toString('base64');

        // Prepare email data
        const emailData = {
          recipientEmail,
          subject: subject || `Re: ${document.documentName}`,
          body: body || `Please find the attached document: ${document.documentName}`,
          documentTitle: document.documentName,
          emailContext,
          attachFile: true,
          fileContent: fileBase64,
          fileName: document.documentName,
          fileSize: document.fileSize
        };

        // For now, simulate the enhanced email (you can integrate with SES later)
        console.log(`✅ Email prepared with attachment: ${document.documentName} (${document.fileSize} bytes)`);
        
        res.json({
          success: true,
          message: `Email with attachment prepared for ${recipientEmail}`,
          emailSent: false,
          simulation: true,
          details: {
            to: recipientEmail,
            subject: emailData.subject,
            body: emailData.body,
            attachment: {
              filename: document.documentName,
              size: document.fileSize,
              type: document.documentType
            }
          }
        });

      } catch (error) {
        console.error('❌ Error processing attachment:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process file attachment'
        });
      }
    });

    downloadStream.on('error', (error) => {
      console.error('❌ Error downloading file from GridFS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file from database'
      });
    });

  } catch (error) {
    console.error('❌ Error sending email with attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email with attachment'
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
