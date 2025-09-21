import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import persistentAgentService from '../services/persistentAgentService.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Smart request queue with session-based rate limiting
let requestQueue = [];
let isProcessing = false;
let sessionLastRequestTime = new Map(); // Track per session
let globalLastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds globally (Nova Micro is much faster)
const SESSION_MIN_INTERVAL = 1000; // 1 second per session (Nova Micro can handle this)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
let responseCache = new Map();
const USE_PERSISTENT_AGENT = true; // Enable persistent agent for faster responses

/**
 * Filter out repetitive greeting from agent responses
 */
function filterRepetitiveGreeting(response) {
  if (!response || typeof response !== 'string') return response;
  
  // Multiple patterns to catch different variations of the greeting
  const greetingPatterns = [
    // Main pattern with emojis
    /Hello!\s*I'm your.*?CRM Assistant\.\s*I can help you with:[\s\S]*?📋.*?Task Management.*?to-do items\s*/i,
    // Pattern without emojis
    /Hello!\s*I'm your.*?CRM Assistant\.\s*I can help you with:[\s\S]*?Task Management.*?to-do items\s*/i,
    // Shorter version
    /Hello!\s*I'm your.*?CRM Assistant\.[\s\S]*?What can I help you with today\?/i,
    // Generic assistant intro
    /I'm your.*?CRM Assistant.*?I can help you with:[\s\S]*?to-do items/i
  ];
  
  let filtered = response;
  
  // Apply each pattern
  for (const pattern of greetingPatterns) {
    filtered = filtered.replace(pattern, '').trim();
  }
  
  // Remove any remaining "What can I help you with today?" at the end
  filtered = filtered.replace(/\n*What can I help you with today\?\s*$/i, '').trim();
  
  // If the response is now empty or too short, return a helpful response
  if (!filtered || filtered.length < 10) {
    return "How can I help you today?";
  }
  
  return filtered;
}

/**
 * Generate cache key for request
 */
function getCacheKey(message, sessionId) {
  // Normalize message for caching (remove extra spaces, lowercase)
  const normalizedMessage = message.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalizedMessage}:${sessionId || 'default'}`;
}

/**
 * Check cache for existing response
 */
function getCachedResponse(message, sessionId) {
  const cacheKey = getCacheKey(message, sessionId);
  const cached = responseCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`💾 Cache hit for: ${message.substring(0, 50)}...`);
    return cached.response;
  }
  
  return null;
}

/**
 * Store response in cache
 */
function cacheResponse(message, sessionId, response) {
  const cacheKey = getCacheKey(message, sessionId);
  responseCache.set(cacheKey, {
    response: response,
    timestamp: Date.now()
  });
  
  // Clean old cache entries (keep cache size manageable)
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

/**
 * Smart queue system with session-based rate limiting
 */
async function processRequestQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { message, sessionId, enableTrace, resolve, reject } = requestQueue.shift();

    try {
      // Check cache first
      const cachedResponse = getCachedResponse(message, sessionId);
      if (cachedResponse) {
        resolve(cachedResponse);
        continue;
      }

      // Smart rate limiting - check both global and session limits
      const now = Date.now();
      const sessionKey = sessionId || 'default';
      const sessionLastTime = sessionLastRequestTime.get(sessionKey) || 0;
      
      const globalWait = Math.max(0, MIN_REQUEST_INTERVAL - (now - globalLastRequestTime));
      const sessionWait = Math.max(0, SESSION_MIN_INTERVAL - (now - sessionLastTime));
      
      // Use the minimum required wait time
      const waitTime = Math.max(globalWait, sessionWait);
      
      if (waitTime > 0) {
        console.log(`⏳ Smart rate limiting: waiting ${waitTime}ms (global: ${globalWait}ms, session: ${sessionWait}ms)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Update timing trackers
      const requestTime = Date.now();
      globalLastRequestTime = requestTime;
      sessionLastRequestTime.set(sessionKey, requestTime);
      
      // Call the agent (use persistent agent if available, fallback to process spawn)
      let result;
      if (USE_PERSISTENT_AGENT) {
        try {
          result = await persistentAgentService.invokeAgent(message, sessionId, enableTrace);
          console.log('⚡ Used persistent agent (faster)');
        } catch (error) {
          console.log('⚠️ Persistent agent failed, falling back to process spawn');
          result = await callLegalAgent(message, sessionId, enableTrace);
        }
      } else {
        result = await callLegalAgent(message, sessionId, enableTrace);
      }
      
      // Filter out repetitive greeting if present
      if (result.response) {
        result.response = filterRepetitiveGreeting(result.response);
      }
      
      // Cache the response
      cacheResponse(message, sessionId, result);
      
      resolve(result);
      
    } catch (error) {
      reject(error);
    }
  }

  isProcessing = false;
}

/**
 * Add request to queue
 */
function queueAgentRequest(message, sessionId = null, enableTrace = false) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ message, sessionId, enableTrace, resolve, reject });
    processRequestQueue();
  });
}

/**
 * Helper function to call Python legal agent interface
 */
async function callLegalAgent(message, sessionId = null, enableTrace = false) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '../../handler/legal_agent_interface.py');
    
    // Prepare arguments for Python script
    const args = [
      pythonScriptPath,
      '--message', message,
      '--session-id', sessionId || 'default-session',
      '--enable-trace', enableTrace.toString()
    ];

    const pythonProcess = spawn('python3', args, {
      cwd: path.join(__dirname, '../../handler')
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          console.log('🐍 Python stdout:', stdout);
          console.log('🐍 Python stderr:', stderr);
          
          // Clean the stdout - remove any non-JSON content
          const lines = stdout.split('\n');
          let jsonLine = '';
          
          // Find the line that looks like JSON
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              jsonLine = trimmed;
              break;
            }
          }
          
          if (!jsonLine) {
            console.error('❌ No JSON found in Python output');
            console.error('Raw stdout:', stdout);
            reject(new Error('No valid JSON response from agent'));
            return;
          }
          
          // Parse the JSON response from Python
          const response = JSON.parse(jsonLine);
          console.log('✅ Parsed Python response:', response);
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing Python response:', error);
          console.error('Raw stdout:', stdout);
          reject(new Error('Failed to parse agent response'));
        }
      } else {
        console.error('❌ Python script error (code:', code, '):', stderr);
        reject(new Error(`Agent invocation failed: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(new Error('Failed to start legal agent'));
    });
  });
}

/**
 * Main chat endpoint - Uses Bedrock Agent directly
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = null, enableTrace = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`💬 Chat request queued: ${message.substring(0, 100)}...`);
    console.log(`📊 Queue status: ${requestQueue.length} requests waiting`);

    // Add to queue instead of calling directly
    const agentResponse = await queueAgentRequest(message, sessionId, enableTrace);
    
    console.log('✅ Agent response received');
    
    res.json({
      success: true,
      response: agentResponse.response,
      sessionId: agentResponse.session_id,
      timestamp: agentResponse.timestamp,
      trace: agentResponse.trace_data || null
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error processing chat request' 
    });
  }
});

/**
 * Legacy OpenAI endpoint (kept for backward compatibility)
 */
router.post('/chat-openai', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Import aiService only when needed for legacy support
    const { aiService } = await import('../services/aiService.js');
    const result = await aiService.processChatWithOpenAI(message, conversationHistory);
    
    res.json(result);
  } catch (error) {
    console.error('OpenAI chat error:', error);
    res.status(500).json({ error: 'Error processing OpenAI chat request' });
  }
});

export default router;
