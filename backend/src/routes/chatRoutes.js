import express from 'express';
import { aiService } from '../services/aiService.js';
import axios from 'axios';

const router = express.Router();

/**
 * Process workspace actions from AI response
 */
async function processWorkspaceActions(aiResponse, userMessage, context) {
  const actions = [];
  const createdTodos = [];
  const additionalMessages = [];

  // Enhanced todo detection patterns (more flexible)
  const todoPatterns = [
    // Pattern 1: "create a todo for [task]" or "add a task for [task]"
    /(?:create|add).*?(?:todo|task).*?(?:for|to)\s+(.+?)(?:\.|$)/gi,
    // Pattern 2: "create a todo: [task]" or "add a task: [task]" (with colon/dash)
    /(?:create|add).*?(?:todo|task).*?[:\-]\s*(.+?)(?:\.|$)/gi,
    // Pattern 3: "I suggest creating a todo for [task]"
    /suggest.*?(?:creating|adding).*?(?:todo|task).*?(?:for|to)\s+(.+?)(?:\.|$)/gi,
    // Pattern 4: "You should create a todo to [task]"
    /should.*?(?:create|add).*?(?:todo|task).*?(?:to|for)\s+(.+?)(?:\.|$)/gi,
    // Pattern 5: Quoted format "create a todo 'task'"
    /(?:create|add).*?(?:todo|task).*?["']([^"']+)["']/gi,
    // Pattern 6: "TODO: task" format
    /(?:TODO|Task)\s*[:\-]\s*(.+?)(?:\.|$)/gi,
    // Pattern 7: "I'll help you create a todo for [task]"
    /(?:I'll|I will).*?(?:create|add).*?(?:todo|task).*?(?:for|to)\s+(.+?)(?:\.|$)/gi
  ];

  // Process todo creation
  console.log('🔍 Processing AI response for todos:', aiResponse);
  console.log('🔍 User message:', userMessage);
  
  for (const pattern of todoPatterns) {
    const matches = [...aiResponse.matchAll(pattern)];
    console.log('🔍 Pattern:', pattern, 'Matches:', matches.length);
    
    for (const match of matches) {
      const taskDescription = match[1]?.trim();
      console.log('🔍 Extracted task:', taskDescription);
      if (taskDescription && taskDescription.length > 5 && taskDescription.length < 200) {
        try {
          // Create todo directly using the same logic as workspace routes
          // Import the shared storage from workspace routes
          const { createTodoDirectly } = await import('./workspaceHelpers.js');
          
          const newTodo = await createTodoDirectly({
            taskDescription: taskDescription,
            emailAddress: 'default@example.com',
            emailContext: 'AI created task',
            documentTitle: 'AI Generated Task'
          });

          if (newTodo) {
            createdTodos.push(newTodo);
            actions.push('todo_created');
            additionalMessages.push(`✅ I've created a todo: "${taskDescription}"`);
            console.log('AI auto-created todo:', taskDescription);
          } else {
            throw new Error('Failed to create todo');
          }
        } catch (error) {
          console.error('Error auto-creating todo:', error);
          additionalMessages.push(`❌ Sorry, I couldn't create the todo "${taskDescription}". Please try creating it manually.`);
        }
      }
    }
    
    // If we found matches with this pattern, don't try other patterns
    if (matches.length > 0) break;
  }

  // Handle cases where user asked for todo creation but no automatic todos were created
  if (createdTodos.length === 0 && (
    userMessage.toLowerCase().includes('create todo') || 
    userMessage.toLowerCase().includes('add task') ||
    userMessage.toLowerCase().includes('make a todo')
  )) {
    actions.push('todo_help');
    additionalMessages.push(`💡 I can help you create todos! You can either:\n1. Ask me to "create a todo for [task description]"\n2. Use the + button in your workspace\n3. Tell me what you need to do and I'll suggest creating a todo for it`);
  }

  return {
    actions,
    createdTodos,
    additionalMessages
  };
}

/**
 * Chat endpoint using OpenAI with workspace context support
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], context = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if this is a workspace-enabled chat
    let enhancedMessage = message;
    let workspaceActions = [];
    
    if (context && context.type === 'workspace') {
      // Add workspace context to the message
      const { todos = [], files = [] } = context;
      
      let contextInfo = `\n\n[WORKSPACE CONTEXT - You can help with todos and emails]\n`;
      contextInfo += `Available Actions: Create todos, send emails, analyze files\n`;
      
      if (todos.length > 0) {
        contextInfo += `Current Todos (${todos.length}):\n`;
        todos.slice(0, 5).forEach((todo, index) => {
          contextInfo += `${index + 1}. ${todo.task} (${todo.completed ? 'Completed' : 'Pending'})\n`;
        });
        if (todos.length > 5) {
          contextInfo += `... and ${todos.length - 5} more todos\n`;
        }
      }
      
      if (files.length > 0) {
        contextInfo += `\nRecent Files (${files.length}):\n`;
        files.slice(0, 3).forEach((file, index) => {
          contextInfo += `${index + 1}. ${file.name} (${file.type.toUpperCase()}, ${file.date})\n`;
        });
        if (files.length > 3) {
          contextInfo += `... and ${files.length - 3} more files\n`;
        }
      }
      
      contextInfo += `\nIMPORTANT: When user asks to create todos, respond with "I'll create a todo for [specific task description]" to automatically create the todo. For emails, provide specific instructions.\n`;
      contextInfo += `[END CONTEXT]\n\n`;
      
      enhancedMessage = message + contextInfo;
      
      // Detect potential workspace actions
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('todo') || lowerMessage.includes('task') || lowerMessage.includes('remind')) {
        workspaceActions.push('todo_suggestion');
      }
      if (lowerMessage.includes('email') || lowerMessage.includes('send') || lowerMessage.includes('notify')) {
        workspaceActions.push('email_suggestion');
      }
    }

    const result = await aiService.processChatWithOpenAI(enhancedMessage, conversationHistory);
    
    // Process workspace actions automatically if this is a workspace chat
    if (context && context.type === 'workspace' && result.response) {
      const processedResult = await processWorkspaceActions(result.response, message, context);
      result.workspaceActions = processedResult.actions;
      result.createdTodos = processedResult.createdTodos;
      result.additionalMessages = processedResult.additionalMessages;
      
      console.log('🔍 Processed result:', {
        actions: processedResult.actions,
        createdTodos: processedResult.createdTodos,
        additionalMessages: processedResult.additionalMessages
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error processing chat request' });
  }
});

/**
 * Chat endpoint using AWS Bedrock
 */
router.post('/chat-bedrock', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiService.processChatWithBedrock(message, conversationHistory);
    res.json(result);
  } catch (error) {
    console.error('Bedrock chat error:', error);
    res.status(500).json({ error: 'Error processing Bedrock chat request' });
  }
});

export default router;
