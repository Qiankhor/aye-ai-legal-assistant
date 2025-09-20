from http import HTTPStatus
import boto3
import json
import uuid
from datetime import datetime

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
documents_table = dynamodb.Table('legal_documents')

def lambda_handler(event, context):
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        if function == 'saveDocument':
            return save_document(action_group, function, message_version, parameters)
        elif function == 'getDocument':
            return get_document(action_group, function, message_version, parameters)
        elif function == 'listDocuments':
            return list_documents(action_group, function, message_version, parameters)
        else:
            raise ValueError(f"Unknown function: {function}")

    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': f'Internal Server Error: {str(e)}'
        }

def save_document(action_group, function, message_version, parameters):
    # Extract parameters
    documentName = None
    documentContent = None
    analysisResults = None
    documentType = None
    
    for param in parameters:
        if param['name'] == 'documentName':
            documentName = param['value']
        elif param['name'] == 'documentContent':
            documentContent = param['value']
        elif param['name'] == 'analysisResults':
            analysisResults = param['value']
        elif param['name'] == 'documentType':
            documentType = param['value']

    # Validate required parameters
    if not documentName:
        raise ValueError("Document name is required")
    if not documentContent:
        raise ValueError("Document content is required")

    # Check document size (DynamoDB has 400KB limit per item)
    content_size = len(documentContent.encode('utf-8'))
    max_size = 350000  # Leave buffer for other attributes (350KB)
    
    if content_size > max_size:
        # Truncate content and add warning
        documentContent = documentContent[:max_size] + "\n\n[CONTENT TRUNCATED - Document exceeds DynamoDB size limit]"
        print(f"Warning: Document content truncated due to size limit. Original size: {content_size} bytes")

    # Generate unique document ID
    document_id = str(uuid.uuid4())
    current_time = datetime.utcnow().isoformat()

    # Create document item
    document_item = {
        'documentId': document_id,
        'documentName': documentName,
        'documentContent': str(documentContent),  
        'documentType': documentType or 'legal_document',
        'uploadDate': current_time,
        'lastModified': current_time,
        'analysisResults': str(analysisResults) if analysisResults else 'No analysis performed',
        'status': 'active',
        'contentSize': content_size  
    }

    # Save to DynamoDB
    documents_table.put_item(Item=document_item)
    print(f'Document saved successfully with ID: {document_id}')

    # Create success response
    response_body = {
        'TEXT': {
            'body': f'Document "{documentName}" saved successfully with ID: {document_id}'
        }
    }
    
    return create_response(action_group, function, message_version, response_body)

def get_document(action_group, function, message_version, parameters):
    # Extract parameters
    document_id = None
    
    for param in parameters:
        if param['name'] == 'documentId':
            document_id = param['value']

    if not document_id:
        raise ValueError("Document ID is required")

    # Get document from DynamoDB
    try:
        response = documents_table.get_item(Key={'documentId': document_id})
        
        if 'Item' not in response:
            response_body = {
                'TEXT': {
                    'body': f'Document with ID {document_id} not found'
                }
            }
        else:
            document = response['Item']
            response_body = {
                'TEXT': {
                    'body': f"""Document Found:
Name: {document['documentName']}
Type: {document['documentType']}
Upload Date: {document['uploadDate']}
Analysis: {document['analysisResults']}
Content: {document['documentContent'][:200]}{'...' if len(document['documentContent']) > 200 else ''}"""
                }
            }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error retrieving document: {str(e)}")

def list_documents(action_group, function, message_version, parameters):
    # Extract optional filter parameters
    document_type = None
    
    for param in parameters:
        if param['name'] == 'documentType':
            document_type = param['value']

    try:
        # Scan all documents (in production, consider using pagination)
        response = documents_table.scan()
        documents = response['Items']
        
        # Apply filters if provided
        if document_type:
            documents = [doc for doc in documents if doc.get('documentType') == document_type]
        
        if not documents:
            response_body = {
                'TEXT': {
                    'body': 'No documents found matching the criteria'
                }
            }
        else:
            # Create formatted list
            doc_list = []
            for doc in documents[:10]:  # Limit to 10 documents
                doc_list.append(f"• {doc['documentName']} ({doc['documentType']}) - {doc['uploadDate'][:10]}")
            
            response_body = {
                'TEXT': {
                    'body': f"Found {len(documents)} document(s):\n" + "\n".join(doc_list)
                }
            }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error listing documents: {str(e)}")

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
