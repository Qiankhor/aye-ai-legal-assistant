const express = require('express');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const router = express.Router();

// AWS Configuration - Check if credentials are available
const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

let bedrockClient = null;

if (hasAwsCredentials) {
  console.log('✅ AWS credentials found, initializing Bedrock client for chat...');
  bedrockClient = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });
} else {
  console.log('⚠️  No AWS credentials found for chat. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
}

// Helper function to call AWS Bedrock Mistral 7B for chat
async function callBedrockMistralChat(messages) {
  // Check if AWS client is available
  if (!bedrockClient) {
    console.log('AWS Bedrock client not available for chat, using fallback response...');
    return "I'm sorry, but I'm currently unable to process your request. Please check that AWS Bedrock is properly configured.";
  }

  try {
    // Convert messages to a single prompt for Mistral
    const prompt = messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `Human: ${msg.content}`;
      } else {
        return `Assistant: ${msg.content}`;
      }
    }).join('\n\n') + '\n\nAssistant:';

    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    console.log('✅ Successfully used AWS Bedrock Mistral 7B Instruct v0:2 for chat');
    
    // Get the response text and clean it up
    let responseText = responseBody.outputs[0].text;
    
    // Remove conversation format labels and patterns
    if (responseText && responseText.length > 0) {
      // Remove "Human:" and "Assistant:" labels and everything before them
      responseText = responseText.replace(/^.*?(Human:|Assistant:)\s*/gm, '');
      
      // Remove any remaining conversation format patterns
      responseText = responseText.replace(/^(Human|Assistant):\s*/gm, '');
      
      // Count question marks to detect self-dialogue
      const questionCount = (responseText.match(/\?/g) || []).length;
      
      // If there are multiple questions, it's likely self-dialogue - keep only the first part
      if (questionCount > 1) {
        const parts = responseText.split('?');
        responseText = parts[0] + '?';
      }
      
      // Remove patterns where AI asks a question and then answers it
      responseText = responseText.replace(/(.*?)\?\s*([A-Z][^?]*)\?\s*([A-Z][^?]*)/g, '$1?');
      
      // Remove any incomplete sentences or repeated content
      responseText = responseText.replace(/\s*\([^)]*$/, '').trim();
      
      // If response seems incomplete, add a proper ending
      if (!responseText.endsWith('.') && !responseText.endsWith('!') && !responseText.endsWith('?')) {
        responseText += '.';
      }
    }
    
    return responseText;
  } catch (error) {
    console.error('Bedrock API error for chat:', error);
    
    // Fallback response when AWS models are not available
    if (error.message.includes('expired') || 
        error.message.includes('InvalidUserID.NotFound') || 
        error.message.includes('UnauthorizedOperation') ||
        error.message.includes('invalid') ||
        error.message.includes('ValidationException') ||
        error.message.includes('AccessDeniedException')) {
      console.log('AWS Bedrock model not available for chat, using fallback response...');
      return "I'm your AI Legal Assistant! I can help you understand legal documents, answer legal questions, and guide you through completing legal forms. However, I'm currently using a basic analysis system. For the most accurate legal assistance, please ensure AWS Bedrock is properly configured. How can I assist you today?";
    }
    
    throw error;
  }
}

// Legal assistant system prompt
const LEGAL_ASSISTANT_PROMPT = `You are a friendly and knowledgeable AI Legal Assistant helping Malaysian citizens understand legal matters. Respond naturally and conversationally, like a helpful friend who happens to know about law.

IMPORTANT: 
- Respond directly to the user's question or request
- Do not ask and answer your own questions in the same response
- Do not create dialogue between multiple speakers
- Do not simulate conversations or Q&A sessions
- Give a direct, helpful response to what the user asked

Key guidelines:
- Be conversational and approachable, not formal or robotic
- Explain legal concepts in simple, everyday language
- Use examples and analogies when helpful
- Ask follow-up questions to better understand what they need
- Be empathetic and understanding of their concerns
- Keep responses concise but comprehensive
- When appropriate, suggest consulting a legal professional for complex matters

Remember: You provide general information only, not specific legal advice. Be helpful, clear, and human-like in your responses.`;

// Chat endpoint
router.post('/message', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare conversation history for context (limit to last 5 messages to prevent context overflow)
    const recentHistory = conversationHistory.slice(-5);
    const messages = [
      { role: 'system', content: LEGAL_ASSISTANT_PROMPT },
      ...recentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // Add explicit instruction to prevent conversation formatting
    messages.push({ 
      role: 'user', 
      content: 'Please respond directly without using "Human:" or "Assistant:" labels. Just give me a natural response.' 
    });

    // Use AWS Bedrock instead of OpenAI
    const response = await callBedrockMistralChat(messages);

    res.json({
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AWS Bedrock API error:', error);
    res.status(500).json({ 
      error: 'Failed to process your message. Please try again.',
      details: error.message 
    });
  }
});

// Get legal document types and common questions
router.get('/document-types', (req, res) => {
  const documentTypes = [
    {
      id: 'employment-contract',
      name: 'Employment Contract',
      description: 'Work agreements, terms of employment, salary details'
    },
    {
      id: 'rental-agreement',
      name: 'Rental Agreement',
      description: 'Property rental terms, lease conditions, deposit details'
    },
    {
      id: 'purchase-agreement',
      name: 'Purchase Agreement',
      description: 'Property or vehicle purchase contracts'
    },
    {
      id: 'service-agreement',
      name: 'Service Agreement',
      description: 'Service provider contracts, terms of service'
    },
    {
      id: 'loan-agreement',
      name: 'Loan Agreement',
      description: 'Personal loans, business loans, credit agreements'
    },
    {
      id: 'partnership-agreement',
      name: 'Partnership Agreement',
      description: 'Business partnership terms and conditions'
    }
  ];

  res.json({ documentTypes });
});

// Get common legal questions
router.get('/common-questions', (req, res) => {
  const commonQuestions = [
    "What should I look for in an employment contract?",
    "What are my rights as a tenant?",
    "How do I know if a contract is fair?",
    "What happens if I break a contract?",
    "Do I need a lawyer to review this document?",
    "What are the key terms I should understand?",
    "What are the potential risks in this agreement?",
    "Can I negotiate these terms?",
    "What are my obligations under this contract?",
    "How long is this agreement valid?"
  ];

  res.json({ commonQuestions });
});

module.exports = router;
