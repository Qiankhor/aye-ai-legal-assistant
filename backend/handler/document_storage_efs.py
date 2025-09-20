from http import HTTPStatus
import boto3
import json
import uuid
import os
from datetime import datetime
from pathlib import Path
import base64

# DynamoDB for metadata (EFS for files)
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
documents_table = dynamodb.Table('legal_documents')

# EFS mount path (configured in Lambda)
EFS_MOUNT_PATH = "/mnt/efs/legal-documents"

def lambda_handler(event, context):
    try:
        # Ensure EFS mount directory exists
        os.makedirs(EFS_MOUNT_PATH, exist_ok=True)
        
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

    if not documentName or not documentContent:
        raise ValueError("Document name and content are required")

    document_id = str(uuid.uuid4())
    
    # Create directory structure
    document_dir = Path(EFS_MOUNT_PATH) / document_id
    document_dir.mkdir(parents=True, exist_ok=True)
    
    # Determine file path
    file_path = document_dir / documentName
    
    try:
        # Handle different content types
        if isinstance(documentContent, str):
            try:
                # Try to decode as base64 (for binary files)
                file_data = base64.b64decode(documentContent)
                # Write binary file
                with open(file_path, 'wb') as f:
                    f.write(file_data)
            except:
                # Plain text file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(documentContent)
                file_data = documentContent.encode('utf-8')
        else:
            # Binary data
            with open(file_path, 'wb') as f:
                f.write(documentContent)
            file_data = documentContent
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Store metadata in DynamoDB
        document_item = {
            'documentId': document_id,
            'documentName': documentName,
            'documentType': documentType or 'legal_document',
            'filePath': str(file_path),
            'uploadDate': datetime.utcnow().isoformat(),
            'lastModified': datetime.utcnow().isoformat(),
            'analysisResults': analysisResults or 'No analysis performed',
            'status': 'active',
            'fileSize': file_size
        }
        
        documents_table.put_item(Item=document_item)
        print(f'Document saved successfully with ID: {document_id} at {file_path}')
        
        response_body = {
            'TEXT': {
                'body': f'Document "{documentName}" saved successfully with ID: {document_id}'
            }
        }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        # Cleanup on failure
        if file_path.exists():
            file_path.unlink()
        if document_dir.exists() and not any(document_dir.iterdir()):
            document_dir.rmdir()
        raise Exception(f"Error saving document: {str(e)}")

def get_document(action_group, function, message_version, parameters):
    document_id = None
    
    for param in parameters:
        if param['name'] == 'documentId':
            document_id = param['value']

    if not document_id:
        raise ValueError("Document ID is required")

    try:
        # Get document metadata from DynamoDB
        response = documents_table.get_item(Key={'documentId': document_id})
        
        if 'Item' not in response:
            response_body = {
                'TEXT': {
                    'body': f'Document with ID {document_id} not found'
                }
            }
        else:
            document = response['Item']
            file_path = Path(document['filePath'])
            
            # Check if file exists on EFS
            if not file_path.exists():
                response_body = {
                    'TEXT': {
                        'body': f'Document metadata found but file missing at {file_path}'
                    }
                }
            else:
                # Read file content preview
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content_preview = f.read(200)
                except:
                    # Binary file
                    content_preview = "[Binary file - cannot preview]"
                
                file_size_mb = document['fileSize'] / (1024 * 1024)
                
                response_body = {
                    'TEXT': {
                        'body': f"""Document Found:
Name: {document['documentName']}
Type: {document['documentType']}
Upload Date: {document['uploadDate'][:10]}
File Size: {file_size_mb:.2f} MB
File Path: {document['filePath']}
Analysis: {document['analysisResults']}
Content Preview: {content_preview}{'...' if document['fileSize'] > 200 else ''}"""
                    }
                }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error retrieving document: {str(e)}")

def list_documents(action_group, function, message_version, parameters):
    document_type = None
    
    for param in parameters:
        if param['name'] == 'documentType':
            document_type = param['value']

    try:
        # Scan DynamoDB for metadata
        if document_type:
            response = documents_table.scan(
                FilterExpression='documentType = :dt AND #status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':dt': document_type, ':status': 'active'}
            )
        else:
            response = documents_table.scan(
                FilterExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': 'active'}
            )
        
        documents = response['Items']
        
        if not documents:
            response_body = {
                'TEXT': {
                    'body': 'No documents found matching the criteria'
                }
            }
        else:
            # Verify files still exist and create list
            doc_list = []
            for doc in documents[:10]:  # Limit to 10
                file_path = Path(doc['filePath'])
                exists = "✅" if file_path.exists() else "❌"
                size_mb = doc['fileSize'] / (1024 * 1024)
                doc_list.append(f"{exists} {doc['documentName']} ({doc['documentType']}) - {doc['uploadDate'][:10]} - {size_mb:.2f}MB")
            
            response_body = {
                'TEXT': {
                    'body': f"Found {len(documents)} document(s):\n" + "\n".join(doc_list)
                }
            }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error listing documents: {str(e)}")

def create_response(action_group, function, message_version, response_body):
    return {
        'response': {
            'actionGroup': action_group,
            'function': function,
            'functionResponse': {
                'responseBody': response_body
            }
        },
        'messageVersion': message_version
    }
