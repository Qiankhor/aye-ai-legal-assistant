import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route handlers
import chatRoutes from './routes/chatRoutes.js';
import speechRoutes from './routes/speechRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import qaRoutes from './routes/qaRoutes.js';

// Import services to initialize them
import { configService } from './config/clients.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!configService.getOpenAIClient(),
      bedrock: !!configService.getBedrockClient(),
      speech: !!configService.getSpeechClient(),
      textract: !!configService.getTextractClient(),
      aws_configured: configService.isAWSConfigured()
    }
  });
});

// API Routes
app.use('/api', chatRoutes);
app.use('/api', speechRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/qa', qaRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/chat - OpenAI chat`);
  console.log(`   POST /api/chat-bedrock - Bedrock chat`);
  console.log(`   POST /api/speech-to-text - Speech recognition`);
  console.log(`   GET  /api/speech-languages - Supported languages`);
  console.log(`   POST /api/documents/analyze - Document analysis`);
  console.log(`   POST /api/documents/generate - Generate document`);
  console.log(`   POST /api/qa/sessions - Create Q&A session`);
  console.log(`   GET  /api/qa/sessions/:id/progress - Session progress`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully.');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
