import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { configService } from '../config/clients.js';

/**
 * AI Service for handling OpenAI and AWS Bedrock interactions
 */
class AIService {
  constructor() {
    this.systemPrompt = `You are Aye, an AI Legal Assistant. You help users with legal questions, document analysis, contract review, legal research, and provide general legal guidance. You are knowledgeable about various areas of law and can help with:

- Legal document analysis and review
- Contract explanations and suggestions
- Legal research assistance
- General legal questions and guidance
- Legal form completion help
- Legal terminology explanations

Always provide helpful, accurate, and professional legal assistance. If you're unsure about something, recommend consulting with a qualified attorney for specific legal advice.`;
  }

  /**
   * Process chat message using OpenAI
   */
  async processChatWithOpenAI(message, conversationHistory = []) {
    try {
      if (!message) {
        throw new Error('Message is required');
      }

      const openai = configService.getOpenAIClient();

      // Convert conversation history to OpenAI format
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

      // Create conversation context
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        ...formattedHistory,
        {
          role: 'user',
          content: message
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return {
        response: completion.choices[0].message.content,
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Error processing chat request with OpenAI');
    }
  }

  /**
   * Process chat message using AWS Bedrock
   */
  async processChatWithBedrock(message, conversationHistory = []) {
    try {
      if (!message) {
        throw new Error('Message is required');
      }

      const bedrock = configService.getBedrockClient();

      // Build conversation context
      let conversationContext = this.systemPrompt + '\n\nConversation History:\n';

      // Add conversation history
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.sender === 'bot' ? 'Assistant' : 'User'}: ${msg.text}\n`;
      });

      conversationContext += `\nUser: ${message}\n\nAssistant:`;

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt: conversationContext,
          max_tokens: 1000,
          temperature: 0.7
        })
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
      console.error('Bedrock chat error:', error);
      throw new Error('Error processing chat request with Bedrock');
    }
  }

  /**
   * Generate document summary for analysis
   */
  async generateDocumentSummary(formFields, documentName) {
    try {
      const prompt = `You are analyzing a legal document called "${documentName}". 
      Based on the form fields found in this document, provide a comprehensive summary of what this document is for and what information it collects.
      
      Form fields found:
      ${formFields.map(field => `- ${field.key}: ${field.value || 'Empty'}`).join('\n')}
      
      Provide a clear, professional summary that explains:
      1. What type of legal document this appears to be
      2. What information it collects
      3. What fields are missing and need to be filled
      4. Any important legal considerations the user should be aware of
      
      Keep the summary concise but informative.`;

      const bedrock = configService.getBedrockClient();

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.3
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.outputs[0].text;
    } catch (error) {
      console.error('Error generating document summary:', error);
      return `This appears to be a legal document with ${formFields.length} fields that need to be completed.`;
    }
  }

  /**
   * Generate questions for document completion
   */
  async generateQuestionsForDocument(formFields, documentName) {
    try {
      const emptyFields = formFields.filter(field => !field.value || field.value.trim() === '');
      
      if (emptyFields.length === 0) {
        return [];
      }

      // Try OpenAI first for better question generation
      try {
        const openai = configService.getOpenAIClient();
        
        const prompt = `You are analyzing a legal document called "${documentName}". 
        The following fields were found but are empty or need clarification:
        
        ${emptyFields.map(field => `- ${field.key}`).join('\n')}
        
        Generate specific, clear questions to ask the user to fill in these missing fields. 
        Make the questions professional and legal-appropriate. Return ONLY a JSON array of question objects with this exact format:
        [{"field": "field_name", "question": "What is your full name?", "type": "text", "required": true}]
        
        Field types can be: text, email, phone, date, number, address, or select.
        For select type, include an "options" array.
        
        Make sure the questions are directly related to the actual fields found in the document.
        Return ONLY the JSON array, no other text.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.3,
        });

        const responseText = completion.choices[0].message.content.trim();
        
        // Try to parse JSON from OpenAI response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        console.warn('No valid JSON found in OpenAI response:', responseText);
      } catch (openaiError) {
        console.warn('OpenAI question generation failed, using fallback:', openaiError.message);
      }

      // Fallback: Generate simple questions based on field names
      return this.generateFallbackQuestions(emptyFields);
    } catch (error) {
      console.error('Error generating questions:', error);
      return [];
    }
  }

  /**
   * Generate fallback questions when AI generation fails
   */
  generateFallbackQuestions(emptyFields) {
    return emptyFields.map(field => {
      const fieldName = field.key.toLowerCase();
      let question = `What is your ${field.key.toLowerCase()}?`;
      let type = 'text';
      
      if (fieldName.includes('email')) {
        question = `What is your email address?`;
        type = 'email';
      } else if (fieldName.includes('phone')) {
        question = `What is your phone number?`;
        type = 'phone';
      } else if (fieldName.includes('date') || fieldName.includes('birth')) {
        question = `What is your ${field.key.toLowerCase()}?`;
        type = 'date';
      } else if (fieldName.includes('name')) {
        question = `What is your full name?`;
      } else if (fieldName.includes('address')) {
        question = `What is your address?`;
        type = 'address';
      } else if (fieldName.includes('company')) {
        question = `What is your company name?`;
      } else if (fieldName.includes('position') || fieldName.includes('title')) {
        question = `What is your job title or position?`;
      }
      
      return {
        field: field.key,
        question: question,
        type: type,
        required: true
      };
    });
  }

  /**
   * Generate completed document content
   */
  async generateCompletedDocument(documentName, filledFields, originalFields) {
    try {
      const prompt = `Generate a completed legal document based on the following information:

Document Name: ${documentName}

Original Fields and Values:
${originalFields.map(field => `${field.key}: ${field.value || '[Empty]'}`).join('\n')}

Filled Information:
${filledFields.map(field => `${field.key}: ${field.value}`).join('\n')}

Generate a professional, properly formatted legal document that incorporates all the filled information. 
Make it look like a real legal document with proper formatting, headers, and structure.
Include all the original field labels and fill them with the provided values.
Make sure the document is complete and ready for use.`;

      const bedrock = configService.getBedrockClient();

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: 2000,
          temperature: 0.3
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.outputs[0].text;
    } catch (error) {
      console.error('Error generating document content:', error);
      return `COMPLETED LEGAL DOCUMENT: ${documentName}\n\n${filledFields.map(field => `${field.key}: ${field.value}`).join('\n')}`;
    }
  }
}

export const aiService = new AIService();
