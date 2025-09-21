#!/usr/bin/env python3
"""
Legal AI Assistant Agent Interface
Complete interface for interacting with Bedrock agent and all services
"""

import boto3
import uuid
import json
import base64
import os
import time
import threading
from datetime import datetime
from typing import Optional, Dict, List, Any, Union
import textwrap

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ python-dotenv not installed. Install with: pip install python-dotenv")
    pass

class LegalAgentInterface:
    """Complete interface for Legal AI Assistant with organized functions"""
    
    def __init__(self, agent_id: str = None, agent_alias_id: str = None, region: str = None):
        """
        Initialize the Legal Agent Interface
        
        Args:
            agent_id: Bedrock agent ID (optional, can use BEDROCK_AGENT_ID env var)
            agent_alias_id: Bedrock agent alias ID (optional, can use BEDROCK_AGENT_ALIAS_ID env var)
            region: AWS region (optional, can use AWS_DEFAULT_REGION env var)
        """
        # Use environment variables as defaults
        self.agent_id = agent_id or os.getenv('BEDROCK_AGENT_ID')
        self.agent_alias_id = agent_alias_id or os.getenv('BEDROCK_AGENT_ALIAS_ID')
        self.region = region or os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
        
        # Validate required parameters
        if not self.agent_id:
            raise ValueError("agent_id is required. Set BEDROCK_AGENT_ID environment variable or pass as parameter.")
        if not self.agent_alias_id:
            raise ValueError("agent_alias_id is required. Set BEDROCK_AGENT_ALIAS_ID environment variable or pass as parameter.")
        
        # Initialize AWS clients
        self.bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name=self.region)
        self.bedrock_agent = boto3.client('bedrock-agent', region_name=self.region)
        
        # Session management
        self.current_session_id = None
        
        # Enhanced rate limiting (configurable via environment variables)
        self.last_request_time = 0
        # Optimized rate limiting for Nova Micro model (much faster than Titan)
        self.min_request_interval = float(os.getenv('MIN_REQUEST_INTERVAL', '1.0'))  # Nova Micro can handle 1 second intervals
        self.max_retries = int(os.getenv('MAX_RETRIES', '3'))
        self.retry_delay = float(os.getenv('RETRY_DELAY', '5.0'))  # Faster retry for Nova Micro
        self.exponential_backoff = True
        
        # Model-specific optimization
        self.model_type = 'nova-micro'  # Updated to Nova Micro model
        
        # Request queue to prevent concurrent calls
        self._request_lock = threading.Lock()
        self._request_queue = []
        
        # Throttling statistics
        self._throttle_count = 0
        self._successful_requests = 0
        
        print(f"✅ Legal Agent Interface initialized")
        print(f"   Agent ID: {self.agent_id}")
        print(f"   Alias ID: {self.agent_alias_id}")
        print(f"   Region: {self.region}")
        print(f"   Model: {self.model_type.upper()}")
        print(f"   Rate Limit: {self.min_request_interval}s between requests (optimized for Nova Micro)")
        print(f"   🚀 Nova Micro Benefits: Faster responses, higher rate limits, lower latency")
    
    def start_new_session(self) -> str:
        """Start a new conversation session"""
        self.current_session_id = str(uuid.uuid4())
        print(f"🆕 New session started: {self.current_session_id}")
        return self.current_session_id
    
    def get_session_id(self) -> str:
        """Get current session ID, create new if none exists"""
        if not self.current_session_id:
            return self.start_new_session()
        return self.current_session_id
    
    # ==================== CORE AGENT INTERACTION ====================
    
    def invoke_agent(self, message: str, enable_trace: bool = False, 
                    session_id: Optional[str] = None, width: int = 80) -> Dict[str, Any]:
        """
        Invoke the Bedrock agent with enhanced rate limiting and retry logic
        
        Args:
            message: User message to send to agent
            enable_trace: Whether to show detailed trace information
            session_id: Optional session ID (uses current if not provided)
            width: Text wrapping width for output
            
        Returns:
            Dict containing agent response and metadata
        """
        if not session_id:
            session_id = self.get_session_id()
        
        # Use request lock to prevent concurrent calls
        with self._request_lock:
            return self._invoke_agent_with_retry(message, enable_trace, session_id, width)
    
    def _invoke_agent_with_retry(self, message: str, enable_trace: bool, 
                                session_id: str, width: int) -> Dict[str, Any]:
        """Internal method with retry logic and rate limiting"""
        
        for attempt in range(self.max_retries + 1):
            try:
                # Rate limiting - wait if needed
                current_time = time.time()
                time_since_last = current_time - self.last_request_time
                
                if time_since_last < self.min_request_interval:
                    wait_time = self.min_request_interval - time_since_last
                    print(f"⏳ Rate limiting: waiting {wait_time:.1f}s...")
                    time.sleep(wait_time)
                
                self.last_request_time = time.time()
                
                print(f"👤 User: {textwrap.fill(message, width=width)}")
                print("🤖 Agent: ", end="", flush=True)
                
                # Make the actual API call
                response = self.bedrock_agent_runtime.invoke_agent(
                    agentId=self.agent_id,
                    agentAliasId=self.agent_alias_id,
                    sessionId=session_id,
                    inputText=message,
                    endSession=False,
                    enableTrace=enable_trace
                )
                
                # Process the response
                event_stream = response["completion"]
                agent_response = ""
                trace_data = []
                
                for event in event_stream:
                    if 'chunk' in event:
                        chunk_text = event['chunk'].get('bytes', b'').decode('utf-8')
                        if not enable_trace:
                            print(chunk_text, end='', flush=True)
                        agent_response += chunk_text
                        
                    elif 'trace' in event and enable_trace:
                        trace_info = self._process_trace_event(event['trace'], width)
                        trace_data.append(trace_info)
                
                print(f"\n📋 Session ID: {session_id}")
                
                # Success - reset throttle count and update stats
                self._successful_requests += 1
                if self._throttle_count > 0:
                    print(f"✅ Recovered from throttling after {self._throttle_count} attempts")
                    self._throttle_count = 0
                
                return {
                    'success': True,
                    'response': agent_response,
                    'session_id': session_id,
                    'trace_data': trace_data if enable_trace else None,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
            except Exception as e:
                error_str = str(e)
                
                # Check if it's a throttling error
                if 'throttlingException' in error_str or 'throttling' in error_str.lower():
                    self._throttle_count += 1
                    
                    if attempt < self.max_retries:
                        # Calculate exponential backoff delay
                        if self.exponential_backoff:
                            delay = self.retry_delay * (2 ** attempt)
                        else:
                            delay = self.retry_delay
                        
                        print(f"\n⚠️ Throttling detected (attempt {attempt + 1}/{self.max_retries + 1})")
                        print(f"⏳ Waiting {delay:.1f}s before retry...")
                        time.sleep(delay)
                        continue
                    else:
                        error_msg = f"Agent throttled after {self.max_retries + 1} attempts. Try again later."
                        print(f"\n❌ {error_msg}")
                        return {
                            'success': False,
                            'error': error_msg,
                            'session_id': session_id,
                            'timestamp': datetime.utcnow().isoformat(),
                            'throttle_count': self._throttle_count
                        }
                else:
                    # Non-throttling error - don't retry
                    error_msg = f"Agent invocation failed: {error_str}"
                    print(f"\n❌ {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg,
                        'session_id': session_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }
        
        # Should never reach here
        return {
            'success': False,
            'error': 'Unexpected error in retry logic',
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _process_trace_event(self, trace: Dict, width: int) -> Dict[str, Any]:
        """Process and display trace events"""
        trace_info = {'type': 'unknown', 'details': {}}
        
        if 'trace' in trace:
            trace_details = trace['trace']
            
            if 'orchestrationTrace' in trace_details:
                orch_trace = trace_details['orchestrationTrace']
                trace_info['type'] = 'orchestration'
                
                if 'rationale' in orch_trace:
                    thought = orch_trace['rationale']['text']
                    print(f"\n🧠 Agent's thought process:")
                    print(textwrap.fill(thought, width=width, initial_indent='   ', subsequent_indent='   '))
                    trace_info['details']['rationale'] = thought
                
                if 'invocationInput' in orch_trace:
                    inv_input = orch_trace['invocationInput']
                    print(f"\n📞 Invocation Input:")
                    print(f"   Type: {inv_input.get('invocationType', 'N/A')}")
                    if 'actionGroupInvocationInput' in inv_input:
                        agi = inv_input['actionGroupInvocationInput']
                        print(f"   Action Group: {agi.get('actionGroupName', 'N/A')}")
                        print(f"   Function: {agi.get('function', 'N/A')}")
                        print(f"   Parameters: {agi.get('parameters', 'N/A')}")
                        trace_info['details']['invocation'] = agi
                
                if 'observation' in orch_trace:
                    obs = orch_trace['observation']
                    print(f"\n👁️ Observation:")
                    print(f"   Type: {obs.get('type', 'N/A')}")
                    trace_info['details']['observation'] = obs
                    
                    if 'actionGroupInvocationOutput' in obs:
                        output = obs['actionGroupInvocationOutput'].get('text', 'N/A')
                        print(f"   Action Group Output: {output}")
                    
                    if 'finalResponse' in obs:
                        final_response = obs['finalResponse']['text']
                        print(f"\n✅ Final response:")
                        print(textwrap.fill(final_response, width=width, initial_indent='   ', subsequent_indent='   '))
        
        return trace_info
    
    # ==================== DOCUMENT OPERATIONS ====================
    
    def save_document(self, document_name: str, document_content: str, 
                     document_type: str = "legal_document", 
                     analysis_results: Optional[str] = None) -> Dict[str, Any]:
        """
        Save a document using the agent
        
        Args:
            document_name: Name of the document
            document_content: Content of the document
            document_type: Type of document (contract, agreement, etc.)
            analysis_results: Optional analysis results
            
        Returns:
            Agent response with document ID
        """
        message = f"""Save this document:
        
Document Name: {document_name}
Document Type: {document_type}
Content: {document_content}"""
        
        if analysis_results:
            message += f"\nAnalysis: {analysis_results}"
        
        return self.invoke_agent(message, enable_trace=True)
    
    def save_document_from_file(self, file_path: str, document_type: str = "legal_document") -> Dict[str, Any]:
        """
        Save a document from a file
        
        Args:
            file_path: Path to the document file
            document_type: Type of document
            
        Returns:
            Agent response with document ID
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            document_name = os.path.basename(file_path)
            return self.save_document(document_name, content, document_type)
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to read file {file_path}: {str(e)}",
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def list_documents(self, document_type: Optional[str] = None) -> Dict[str, Any]:
        """
        List all documents
        
        Args:
            document_type: Optional filter by document type
            
        Returns:
            Agent response with document list
        """
        if document_type:
            message = f"List all documents of type: {document_type}"
        else:
            message = "List all my documents"
        
        return self.invoke_agent(message, enable_trace=True)
    
    def get_document(self, document_id: str) -> Dict[str, Any]:
        """
        Get a specific document by ID
        
        Args:
            document_id: Document ID to retrieve
            
        Returns:
            Agent response with document details
        """
        message = f"Get document with ID: {document_id}"
        return self.invoke_agent(message, enable_trace=True)
    
    # ==================== TODO LIST OPERATIONS ====================
    
    def add_todo_task(self, task_description: str, email_address: Optional[str] = None,
                     document_title: Optional[str] = None, status: str = "pending") -> Dict[str, Any]:
        """
        Add a task to the todo list
        
        Args:
            task_description: Description of the task
            email_address: Optional email address
            document_title: Optional related document
            status: Task status (pending, in_progress, completed)
            
        Returns:
            Agent response confirming task addition
        """
        message = f"Add a task to my todo list: {task_description}"
        
        if email_address:
            message += f" (Email: {email_address})"
        if document_title:
            message += f" (Related document: {document_title})"
        if status != "pending":
            message += f" (Status: {status})"
        
        return self.invoke_agent(message, enable_trace=True)
    
    def list_todo_tasks(self) -> Dict[str, Any]:
        """List all todo tasks"""
        message = "Show me my todo list"
        return self.invoke_agent(message, enable_trace=True)
    
    # ==================== LEGAL ANALYSIS OPERATIONS ====================
    
    def analyze_document(self, document_content: str, analysis_type: str = "general") -> Dict[str, Any]:
        """
        Analyze a legal document
        
        Args:
            document_content: Content to analyze
            analysis_type: Type of analysis (general, contract, compliance, etc.)
            
        Returns:
            Agent response with analysis results
        """
        message = f"""Please analyze this legal document for {analysis_type} review:

{document_content}

Please provide:
1. Key terms and clauses
2. Potential risks or issues
3. Recommendations
4. Summary of main points"""
        
        return self.invoke_agent(message, enable_trace=True)
    
    def compare_documents(self, doc1_content: str, doc2_content: str) -> Dict[str, Any]:
        """
        Compare two legal documents
        
        Args:
            doc1_content: First document content
            doc2_content: Second document content
            
        Returns:
            Agent response with comparison results
        """
        message = f"""Compare these two legal documents:

DOCUMENT 1:
{doc1_content}

DOCUMENT 2:
{doc2_content}

Please highlight:
1. Key differences
2. Similar clauses
3. Missing elements in either document
4. Recommendations"""
        
        return self.invoke_agent(message, enable_trace=True)
    
    # ==================== UTILITY FUNCTIONS ====================
    
    def check_agent_status(self) -> Dict[str, Any]:
        """Check if the agent and alias are ready"""
        try:
            agent_info = self.bedrock_agent.get_agent(agentId=self.agent_id)
            agent_status = agent_info['agent']['agentStatus']
            agent_name = agent_info['agent']['agentName']
            
            alias_info = self.bedrock_agent.get_agent_alias(
                agentId=self.agent_id, 
                agentAliasId=self.agent_alias_id
            )
            alias_status = alias_info['agentAlias']['agentAliasStatus']
            alias_name = alias_info['agentAlias']['agentAliasName']
            
            ready = agent_status == 'PREPARED' and alias_status == 'PREPARED'
            
            status_info = {
                'agent_ready': ready,
                'agent_name': agent_name,
                'agent_status': agent_status,
                'alias_name': alias_name,
                'alias_status': alias_status
            }
            
            if ready:
                print("✅ Agent and alias are ready for invocation")
            else:
                print("❌ Agent or alias not ready for invocation")
                
            print(f"   Agent '{agent_name}' status: {agent_status}")
            print(f"   Alias '{alias_name}' status: {alias_status}")
            
            return status_info
            
        except Exception as e:
            error_msg = f"Error checking agent status: {str(e)}"
            print(f"❌ {error_msg}")
            return {'agent_ready': False, 'error': error_msg}
    
    def create_sample_document(self, doc_type: str = "employment_contract") -> str:
        """Create sample document content for testing"""
        samples = {
            "employment_contract": """EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on January 1, 2024, between Company ABC ("Company") and John Doe ("Employee").

1. POSITION AND DUTIES
Employee agrees to serve as Software Developer and perform duties as assigned by the Company.

2. COMPENSATION
Employee shall receive an annual salary of $75,000, payable in accordance with Company's standard payroll practices.

3. TERM
This agreement shall commence on January 1, 2024, and continue until terminated by either party.

4. CONFIDENTIALITY
Employee agrees to maintain confidentiality of all proprietary information.

5. TERMINATION
Either party may terminate this agreement with 30 days written notice.

IN WITNESS WHEREOF, the parties have executed this Agreement.

Company ABC                    John Doe
_____________                  _____________
Signature                      Signature""",

            "nda": """NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement is entered into between TechCorp Inc. ("Disclosing Party") and Jane Smith ("Receiving Party").

1. CONFIDENTIAL INFORMATION
All technical data, trade secrets, know-how, research, and business information disclosed by the Disclosing Party.

2. OBLIGATIONS
Receiving Party agrees to:
- Keep all information confidential
- Use information only for evaluation purposes
- Not disclose to third parties

3. TERM
This agreement shall remain in effect for 5 years from the date of execution.

4. RETURN OF MATERIALS
Upon termination, all materials must be returned or destroyed.

Signed: ________________    Date: ________________""",

            "service_agreement": """SERVICE AGREEMENT

This Service Agreement is between Legal Services LLC ("Provider") and Business Corp ("Client").

1. SERVICES
Provider agrees to provide legal consultation services as requested by Client.

2. FEES
Client agrees to pay $300 per hour for legal services.

3. PAYMENT TERMS
Invoices are due within 30 days of receipt.

4. INTELLECTUAL PROPERTY
All work product remains the property of the Client.

5. LIABILITY
Provider's liability is limited to the amount of fees paid.

Effective Date: March 1, 2024"""
        }
        
        return samples.get(doc_type, samples["employment_contract"])
    
    def get_usage_examples(self) -> Dict[str, str]:
        """Get usage examples for the interface"""
        return {
            "basic_chat": 'agent.invoke_agent("Hello, can you help me with a legal question?")',
            "save_document": 'agent.save_document("contract.txt", "This is a contract...", "contract")',
            "save_from_file": 'agent.save_document_from_file("/path/to/document.txt", "agreement")',
            "list_documents": 'agent.list_documents()',
            "filter_documents": 'agent.list_documents("contract")',
            "get_document": 'agent.get_document("document-id-here")',
            "add_todo": 'agent.add_todo_task("Review contract terms")',
            "analyze_document": 'agent.analyze_document("contract content here", "contract")',
            "compare_docs": 'agent.compare_documents("doc1 content", "doc2 content")',
            "check_status": 'agent.check_agent_status()'
        }

# ==================== CONVENIENCE FUNCTIONS ====================

def create_legal_agent(agent_id: str = None, agent_alias_id: str = None, region: str = None) -> LegalAgentInterface:
    """Convenience function to create a legal agent interface using environment variables"""
    return LegalAgentInterface(agent_id, agent_alias_id, region)

def setup_aws_credentials(access_key: str, secret_key: str, region: str = 'us-east-1'):
    """Setup AWS credentials for the session"""
    os.environ['AWS_ACCESS_KEY_ID'] = access_key
    os.environ['AWS_SECRET_ACCESS_KEY'] = secret_key
    os.environ['AWS_DEFAULT_REGION'] = region
    print(f"✅ AWS credentials configured for region: {region}")

if __name__ == "__main__":
    import argparse
    import sys
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Legal Agent Interface CLI')
    parser.add_argument('--message', required=True, help='Message to send to the agent')
    parser.add_argument('--session-id', default=None, help='Session ID for conversation')
    parser.add_argument('--enable-trace', default='false', help='Enable trace output')
    
    args = parser.parse_args()
    
    try:
        # Create agent interface using environment variables
        agent = create_legal_agent()
        
        # Convert string to boolean
        enable_trace = args.enable_trace.lower() == 'true'
        
        # Invoke the agent
        response = agent.invoke_agent(
            message=args.message,
            session_id=args.session_id,
            enable_trace=enable_trace
        )
        
        # Output JSON response for Node.js to parse
        import json
        print(json.dumps(response))
        
    except Exception as e:
        # Output error as JSON
        import json
        error_response = {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
        print(json.dumps(error_response))
        sys.exit(1)
