import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { configService } from '../config/clients.js';

/**
 * Home/Overview AI Service
 * - A copy dedicated for Home page experiments, isolated from Chatbot & Guided Q&A
 */
class HomeAIService {
  constructor() {
    this.systemPrompt = `You are Aye, an AI Legal Assistant for Home/Overview. Provide succinct, helpful responses for quick document insights, highlights, and suggestions.`;
  }

  async quickInsight(message, conversationHistory = []) {
    try {
      if (!message) throw new Error('Message is required');

      const bedrock = configService.getBedrockClient();

      let prompt = this.systemPrompt + '\n\n';
      if (conversationHistory && conversationHistory.length > 0) {
        prompt += 'Conversation History:\n';
        conversationHistory.forEach(msg => {
          prompt += `${msg.sender === 'bot' ? 'Assistant' : 'User'}: ${msg.text}\n`;
        });
        prompt += '\n';
      }
      prompt += `User: ${message}\n\nAssistant:`;

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ prompt, max_tokens: 700, temperature: 0.5 })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        response: responseBody.outputs[0].text,
        timestamp: new Date().toISOString(),
        provider: 'bedrock'
      };
    } catch (error) {
      console.error('Home quickInsight error:', error);
      throw new Error('Error processing Home quick insight');
    }
  }
}

export const homeAiService = new HomeAIService();


