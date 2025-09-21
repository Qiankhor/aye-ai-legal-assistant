import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Persistent Python Agent Service
 * Keeps a Python process running to avoid startup overhead
 */
class PersistentAgentService {
  constructor() {
    this.pythonProcess = null;
    this.isReady = false;
    this.requestQueue = [];
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.startupPromise = null;
  }

  async initialize() {
    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = this._startPythonProcess();
    return this.startupPromise;
  }

  async _startPythonProcess() {
    const pythonScriptPath = path.join(__dirname, '../../handler/persistent_agent.py');
    
    console.log('🐍 Starting persistent Python agent process...');
    
    this.pythonProcess = spawn('python3', [pythonScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let startupBuffer = '';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Python process startup timeout'));
      }, 10000);

      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (!this.isReady) {
          startupBuffer += output;
          if (startupBuffer.includes('AGENT_READY')) {
            clearTimeout(timeout);
            this.isReady = true;
            console.log('✅ Persistent Python agent ready');
            this._setupMessageHandling();
            resolve();
          }
        } else {
          this._handleResponse(output);
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        console.error('🐍 Python stderr:', data.toString());
      });

      this.pythonProcess.on('close', (code) => {
        console.log(`🐍 Python process closed with code ${code}`);
        this.isReady = false;
        this._rejectAllPending('Python process closed');
      });

      this.pythonProcess.on('error', (error) => {
        console.error('🐍 Python process error:', error);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  _setupMessageHandling() {
    let buffer = '';
    
    this.pythonProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete JSON messages
      let lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this._handleResponse(line.trim());
        }
      }
    });
  }

  _handleResponse(response) {
    try {
      const data = JSON.parse(response);
      
      if (data.request_id && this.pendingRequests.has(data.request_id)) {
        const { resolve, reject } = this.pendingRequests.get(data.request_id);
        this.pendingRequests.delete(data.request_id);
        
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error));
        }
      }
    } catch (error) {
      console.error('Error parsing Python response:', error);
    }
  }

  _rejectAllPending(reason) {
    for (const [requestId, { reject }] of this.pendingRequests) {
      reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  async invokeAgent(message, sessionId = null, enableTrace = false) {
    if (!this.isReady) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request = {
        request_id: requestId,
        message: message,
        session_id: sessionId,
        enable_trace: enableTrace
      };

      this.pythonProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async shutdown() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
const persistentAgentService = new PersistentAgentService();

export default persistentAgentService;
