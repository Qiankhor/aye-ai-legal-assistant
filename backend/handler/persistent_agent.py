#!/usr/bin/env python3
"""
Persistent Legal Agent Process
Stays running to avoid startup overhead and provides faster responses
"""

import sys
import json
import signal
from legal_agent_interface import LegalAgentInterface, create_legal_agent

class PersistentAgent:
    def __init__(self):
        self.agent = None
        self.running = True
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        print("Received shutdown signal, exiting gracefully...", file=sys.stderr)
        self.running = False
        sys.exit(0)
    
    def initialize(self):
        """Initialize the agent"""
        try:
            self.agent = create_legal_agent()
            print("AGENT_READY", flush=True)  # Signal to Node.js that we're ready
            return True
        except Exception as e:
            print(f"Failed to initialize agent: {str(e)}", file=sys.stderr)
            return False
    
    def process_request(self, request_data):
        """Process a single request"""
        try:
            request_id = request_data.get('request_id')
            message = request_data.get('message')
            session_id = request_data.get('session_id')
            enable_trace = request_data.get('enable_trace', False)
            
            if not message:
                return {
                    'request_id': request_id,
                    'success': False,
                    'error': 'Message is required'
                }
            
            # Invoke the agent
            response = self.agent.invoke_agent(
                message=message,
                session_id=session_id,
                enable_trace=enable_trace
            )
            
            # Add request ID to response
            response['request_id'] = request_id
            return response
            
        except Exception as e:
            return {
                'request_id': request_data.get('request_id'),
                'success': False,
                'error': str(e)
            }
    
    def run(self):
        """Main event loop"""
        if not self.initialize():
            sys.exit(1)
        
        print("Persistent agent started, waiting for requests...", file=sys.stderr)
        
        try:
            while self.running:
                try:
                    # Read request from stdin
                    line = sys.stdin.readline()
                    if not line:
                        break
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse JSON request
                    request_data = json.loads(line)
                    
                    # Process request
                    response = self.process_request(request_data)
                    
                    # Send response
                    print(json.dumps(response), flush=True)
                    
                except json.JSONDecodeError as e:
                    print(json.dumps({
                        'success': False,
                        'error': f'Invalid JSON: {str(e)}'
                    }), flush=True)
                    
                except Exception as e:
                    print(json.dumps({
                        'success': False,
                        'error': f'Unexpected error: {str(e)}'
                    }), flush=True)
                    
        except KeyboardInterrupt:
            pass
        finally:
            print("Persistent agent shutting down...", file=sys.stderr)

if __name__ == "__main__":
    agent = PersistentAgent()
    agent.run()
