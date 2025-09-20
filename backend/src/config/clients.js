import dotenv from 'dotenv';
import speech from '@google-cloud/speech';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { TextractClient } from '@aws-sdk/client-textract';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration service for initializing external service clients
 */
class ConfigService {
  constructor() {
    this.speechClient = null;
    this.openaiClient = null;
    this.bedrockClient = null;
    this.textractClient = null;
    this.initializeClients();
  }

  initializeClients() {
    try {
      // Initialize Google Cloud Speech client
      this.speechClient = new speech.SpeechClient({
        keyFilename: join(__dirname, '../../google-credentials.json'),
      });

      // Initialize OpenAI client
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Initialize AWS Bedrock client
      this.bedrockClient = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        },
      });

      // Initialize AWS Textract client
      this.textractClient = new TextractClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        },
      });

      // Gemini removed. Using OpenAI and Bedrock only.

      console.log('✅ All external service clients initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing service clients:', error);
      throw error;
    }
  }

  getSpeechClient() {
    if (!this.speechClient) {
      throw new Error('Speech client not initialized');
    }
    return this.speechClient;
  }

  getOpenAIClient() {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    return this.openaiClient;
  }

  // Gemini support removed

  getBedrockClient() {
    if (!this.bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }
    return this.bedrockClient;
  }

  getTextractClient() {
    if (!this.textractClient) {
      throw new Error('Textract client not initialized');
    }
    return this.textractClient;
  }

  // Check if AWS credentials are properly configured
  isAWSConfigured() {
    return process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_ACCESS_KEY_ID !== 'YOUR_NEW_ACCESS_KEY' &&
      process.env.AWS_ACCESS_KEY_ID !== 'ASIA4L423TSC6BE7DXKY';
  }
}

// Export singleton instance
export const configService = new ConfigService();
