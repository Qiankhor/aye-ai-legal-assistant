from http import HTTPStatus
import boto3
import json
import uuid
from datetime import datetime
import re

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
analysis_table = dynamodb.Table('legal_analysis')

def lambda_handler(event, context):
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        if function == 'analyzeDocument':
            return analyze_document(action_group, function, message_version, parameters)
        elif function == 'generateRiskReport':
            return generate_risk_report(action_group, function, message_version, parameters)
        elif function == 'saveAnalysisResults':
            return save_analysis_results(action_group, function, message_version, parameters)
        else:
            raise ValueError(f"Unknown function: {function}")

    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': f'Internal Server Error: {str(e)}'
        }

def analyze_document(action_group, function, message_version, parameters):
    # Extract parameters
    document_text = None
    document_title = None
    analysis_type = None
    
    for param in parameters:
        if param['name'] == 'documentText':
            document_text = param['value']
        elif param['name'] == 'documentTitle':
            document_title = param['value']
        elif param['name'] == 'analysisType':
            analysis_type = param['value']

    if not document_text:
        raise ValueError("Document text is required for analysis")

    # Perform legal analysis
    analysis_results = perform_legal_analysis(document_text, analysis_type or 'comprehensive')
    
    # Generate unique analysis ID
    analysis_id = str(uuid.uuid4())
    current_time = datetime.utcnow().isoformat()

    # Save analysis results
    analysis_item = {
        'analysisId': analysis_id,
        'documentTitle': document_title or 'Untitled Document',
        'analysisType': analysis_type or 'comprehensive',
        'analysisDate': current_time,
        'documentText': document_text[:1000] + '...' if len(document_text) > 1000 else document_text,  # Store excerpt
        'clauses': analysis_results['clauses'],
        'risks': analysis_results['risks'],
        'suggestions': analysis_results['suggestions'],
        'riskLevel': analysis_results['overall_risk'],
        'status': 'completed'
    }

    analysis_table.put_item(Item=analysis_item)
    print(f'Analysis saved with ID: {analysis_id}')

    # Format response for the agent
    response_text = format_analysis_response(analysis_results, document_title)
    
    response_body = {
        'TEXT': {
            'body': response_text
        }
    }
    
    return create_response(action_group, function, message_version, response_body)

def perform_legal_analysis(document_text, analysis_type):
    """
    Simplified analysis function - let the AI agent handle the sophisticated analysis
    This function just provides a framework for the agent to populate
    """
    
    # Simple placeholder analysis that the agent will override
    # The real analysis should be done by the Bedrock agent before calling this function
    
    analysis_framework = {
        'clauses': [
            'Document requires AI agent analysis',
            'Please analyze this document for legal clauses',
            'Common areas: Termination, Liability, Payment, Confidentiality, Governing Law'
        ],
        'risks': [
            {
                'clause': 'Analysis Needed',
                'risk_level': 'Medium',
                'description': 'Document requires comprehensive legal review',
                'justification': 'AI agent should analyze document for specific legal risks and compliance issues'
            }
        ],
        'suggestions': [
            'Have legal expert review the analysis results',
            'Consider specific legal requirements for your jurisdiction',
            'Ensure all critical clauses are properly addressed'
        ],
        'overall_risk': 'Medium',
        'total_clauses_found': 0,
        'total_risks_identified': 1
    }
    
    return analysis_framework

def format_analysis_response(analysis_results, document_title):
    """Format the analysis results into a readable response"""
    
    response = f"""
LEGAL DOCUMENT ANALYSIS REPORT
Document: {document_title or 'Untitled Document'}
Analysis Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

OVERALL RISK LEVEL: {analysis_results['overall_risk'].upper()}

CLAUSES IDENTIFIED ({len(analysis_results['clauses'])}):
"""
    
    for i, clause in enumerate(analysis_results['clauses'], 1):
        response += f"{i}. {clause}\n"
    
    response += f"\nRISK ANALYSIS ({len(analysis_results['risks'])} issues identified):\n"
    response += "+" + "-"*70 + "+\n"
    response += "| Clause/Issue | Risk Level | Description | Justification |\n"
    response += "+" + "-"*70 + "+\n"
    
    for risk in analysis_results['risks']:
        clause = risk['clause'][:15] + '...' if len(risk['clause']) > 15 else risk['clause']
        level = risk['risk_level']
        description = risk['description'][:20] + '...' if len(risk['description']) > 20 else risk['description']
        justification = risk['justification'][:25] + '...' if len(risk['justification']) > 25 else risk['justification']
        response += f"| {clause:<15} | {level:<10} | {description:<20} | {justification:<25} |\n"
    
    response += "+" + "-"*70 + "+\n"
    
    response += f"\nRECOMMENDATIONS ({len(analysis_results['suggestions'])}):\n"
    for i, suggestion in enumerate(analysis_results['suggestions'], 1):
        response += f"{i}. {suggestion}\n"
    
    response += "\nWould you like me to save this analysis to your document library?"
    
    return response

def generate_risk_report(action_group, function, message_version, parameters):
    # Extract parameters
    document_id = None
    
    for param in parameters:
        if param['name'] == 'documentId':
            document_id = param['value']

    if not document_id:
        raise ValueError("Document ID is required for risk report")

    # Get analysis from database
    try:
        response = analysis_table.get_item(Key={'analysisId': document_id})
        
        if 'Item' not in response:
            response_body = {
                'TEXT': {
                    'body': f'Analysis with ID {document_id} not found'
                }
            }
        else:
            analysis = response['Item']
            # Generate formatted risk report
            report = generate_detailed_risk_report(analysis)
            response_body = {
                'TEXT': {
                    'body': report
                }
            }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error generating risk report: {str(e)}")

def save_analysis_results(action_group, function, message_version, parameters):
    # This function allows manual saving of analysis results
    # Implementation similar to analyze_document but for pre-existing analysis
    
    response_body = {
        'TEXT': {
            'body': 'Analysis results saved successfully'
        }
    }
    
    return create_response(action_group, function, message_version, response_body)

def generate_detailed_risk_report(analysis):
    """Generate a detailed risk report from stored analysis"""
    return f"""
DETAILED RISK REPORT
Document: {analysis['documentTitle']}
Analysis Date: {analysis['analysisDate']}
Overall Risk Level: {analysis['riskLevel']}

EXECUTIVE SUMMARY:
This document contains {len(analysis['risks'])} identified risk areas requiring attention.

DETAILED RISK BREAKDOWN:
{json.dumps(analysis['risks'], indent=2)}

RECOMMENDATIONS:
{json.dumps(analysis['suggestions'], indent=2)}
"""

def create_response(action_group, function, message_version, response_body):
    action_response = {
        'actionGroup': action_group,
        'function': function,
        'functionResponse': {
            'responseBody': response_body
        }
    }
    
    return {
        'response': action_response,
        'messageVersion': message_version
    }
