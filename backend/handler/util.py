import boto3
import textwrap

region_name = 'us-east-1' # make sure this is the same region as the region where you created your agent

def check_agent_status(agentId: str, agentAliasId: str):
    """Check if the agent and alias exist and are in a ready state"""
    try:
        bedrock_agent = boto3.client(service_name='bedrock-agent', region_name=region_name)
        
        # Check agent status
        agent_info = bedrock_agent.get_agent(agentId=agentId)
        agent_status = agent_info['agent']['agentStatus']
        agent_name = agent_info['agent']['agentName']
        
        print(f"Agent '{agent_name}' (ID: {agentId}) status: {agent_status}")
        
        # Check alias status
        alias_info = bedrock_agent.get_agent_alias(agentId=agentId, agentAliasId=agentAliasId)
        alias_status = alias_info['agentAlias']['agentAliasStatus']
        alias_name = alias_info['agentAlias']['agentAliasName']
        
        print(f"Alias '{alias_name}' (ID: {agentAliasId}) status: {alias_status}")
        
        # Check if both are ready
        if agent_status == 'PREPARED' and alias_status == 'PREPARED':
            print("✅ Agent and alias are ready for invocation")
            return True
        else:
            print("❌ Agent or alias not ready for invocation")
            return False
            
    except Exception as e:
        print(f"Error checking agent status: {str(e)}")
        if hasattr(e, 'response'):
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', 'Unknown')
            print(f"AWS Error Code: {error_code}")
            print(f"AWS Error Message: {error_message}")
        return False

def test_aws_connection():
    """Test basic AWS connectivity and permissions"""
    try:
        # Test bedrock-agent service
        bedrock_agent = boto3.client(service_name='bedrock-agent', region_name=region_name)
        print("✅ Successfully connected to bedrock-agent service")
        
        # Test bedrock-agent-runtime service
        bedrock_agent_runtime = boto3.client(service_name='bedrock-agent-runtime', region_name=region_name)
        print("✅ Successfully connected to bedrock-agent-runtime service")
        
        # Test basic permissions by listing agents (if any)
        try:
            agents = bedrock_agent.list_agents(maxResults=1)
            print(f"✅ Successfully listed agents (found {len(agents.get('agentSummaries', []))} agents)")
        except Exception as e:
            print(f"⚠️  Warning: Cannot list agents - {str(e)}")
            
        return True
        
    except Exception as e:
        print(f"❌ AWS connection test failed: {str(e)}")
        if hasattr(e, 'response'):
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', 'Unknown')
            print(f"AWS Error Code: {error_code}")
            print(f"AWS Error Message: {error_message}")
        return False

def invoke_agent(agentId: str, agentAliasId: str, inputText: str, sessionId: str, enableTrace: bool = False,
                           endSession: bool = False, width: int = 70):
    # First check if agent and alias are ready
    if not check_agent_status(agentId, agentAliasId):
        print("Cannot invoke agent - agent or alias not ready")
        return None
        
    try:
        bedrock_agent_runtime = boto3.client(service_name='bedrock-agent-runtime', region_name=region_name)

        response = bedrock_agent_runtime.invoke_agent(
            agentId=agentId,
            agentAliasId=agentAliasId,
            sessionId=sessionId,
            inputText=inputText,
            endSession=endSession,
            enableTrace=enableTrace
        )

        event_stream = response["completion"]
        agent_response = ""

        print(f"User: {textwrap.fill(inputText, width=width)}\n")
        print("Agent:", end=" ", flush=True)

        for event in event_stream:
            if 'chunk' in event:
                chunk_text = event['chunk'].get('bytes', b'').decode('utf-8')
                if not enableTrace:  # Only print chunks if trace is not enabled
                    print(textwrap.fill(chunk_text, width=width, subsequent_indent='       '), end='', flush=True)
                agent_response += chunk_text
            elif 'trace' in event and enableTrace:
                trace = event['trace']

                if 'trace' in trace:
                    trace_details = trace['trace']

                    if 'orchestrationTrace' in trace_details:
                        orch_trace = trace_details['orchestrationTrace']

                        if 'invocationInput' in orch_trace:
                            inv_input = orch_trace['invocationInput']
                            print("\nInvocation Input:")
                            print(f"  Type: {inv_input.get('invocationType', 'N/A')}")
                            if 'actionGroupInvocationInput' in inv_input:
                                agi = inv_input['actionGroupInvocationInput']
                                print(f"  Action Group: {agi.get('actionGroupName', 'N/A')}")
                                print(f"  Function: {agi.get('function', 'N/A')}")
                                print(f"  Parameters: {agi.get('parameters', 'N/A')}")

                        if 'rationale' in orch_trace:
                            thought = orch_trace['rationale']['text']
                            print(f"\nAgent's thought process:")
                            print(textwrap.fill(thought, width=width, initial_indent='  ', subsequent_indent='  '))

                        if 'observation' in orch_trace:
                            obs = orch_trace['observation']
                            print("\nObservation:")
                            print(f"  Type: {obs.get('type', 'N/A')}")
                            if 'actionGroupInvocationOutput' in obs:
                                print(f"  Action Group Output: {obs['actionGroupInvocationOutput'].get('text', 'N/A')}")
                            if 'knowledgeBaseLookupOutput' in obs:
                                print("  Knowledge Base Lookup:")
                                for ref in obs['knowledgeBaseLookupOutput'].get('retrievedReferences', []):
                                    print(f"    - {ref['content'].get('text', 'N/A')[:50]}...")
                            if 'codeInterpreterInvocationOutput' in obs:
                                cio = obs['codeInterpreterInvocationOutput']
                                print("  Code Interpreter Output:")
                                print(f"    Execution Output: {cio.get('executionOutput', 'N/A')[:50]}...")
                                print(f"    Execution Error: {cio.get('executionError', 'N/A')}")
                                print(f"    Execution Timeout: {cio.get('executionTimeout', 'N/A')}")
                            if 'finalResponse' in obs:
                                final_response = obs['finalResponse']['text']
                                print(f"\nFinal response:")
                                print(
                                    textwrap.fill(final_response, width=width, initial_indent='  ', subsequent_indent='  '))

                    if 'guardrailTrace' in trace_details:
                        guard_trace = trace_details['guardrailTrace']
                        print("\nGuardrail Trace:")
                        print(f"  Action: {guard_trace.get('action', 'N/A')}")

                        for assessment in guard_trace.get('inputAssessments', []) + guard_trace.get('outputAssessments',
                                                                                                    []):
                            if 'contentPolicy' in assessment:
                                for filter in assessment['contentPolicy'].get('filters', []):
                                    print(
                                        f"  Content Filter: {filter['type']} (Confidence: {filter['confidence']}, Action: {filter['action']})")

                            if 'sensitiveInformationPolicy' in assessment:
                                for pii in assessment['sensitiveInformationPolicy'].get('piiEntities', []):
                                    print(f"  PII Detected: {pii['type']} (Action: {pii['action']})")

        print(f"\n\nSession ID: {response.get('sessionId')}")
        return agent_response
        
    except Exception as e:
        print(f"\nError invoking agent: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Check if it's a specific AWS error
        if hasattr(e, 'response'):
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', 'Unknown')
            print(f"AWS Error Code: {error_code}")
            print(f"AWS Error Message: {error_message}")
        
        return None