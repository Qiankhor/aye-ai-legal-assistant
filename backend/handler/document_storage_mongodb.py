from http import HTTPStatus
import json
import uuid
import os
from datetime import datetime
from pymongo import MongoClient
import gridfs
import base64

# MongoDB Atlas connection with Lambda-compatible SSL settings
MONGODB_URI = os.getenv('MONGODB_URI', 
    "mongodb+srv://22004854_db_user:6jh13YQAA2q3IQfu@legal-assistant-cluster.xzgmqkv.mongodb.net/?retryWrites=true&w=majority&ssl=true&ssl_cert_reqs=CERT_NONE&appName=legal-assistant-cluster"
)

# Global variables for connection reuse (Lambda container reuse)
client = None
db = None
fs = None

def get_mongodb_connection():
    """Get MongoDB connection with multiple fallback methods"""
    global client, db, fs
    
    if client is None:
        # Try multiple connection methods
        connection_methods = [
            {
                "name": "SSL with CERT_NONE",
                "params": {
                    "serverSelectionTimeoutMS": 15000,
                    "connectTimeoutMS": 15000,
                    "socketTimeoutMS": 15000,
                    "maxPoolSize": 1,
                    "retryWrites": True,
                    "ssl": True,
                    "ssl_cert_reqs": __import__('ssl').CERT_NONE,
                    "ssl_match_hostname": False,
                    "ssl_ca_certs": None
                }
            },
            {
                "name": "TLS with invalid certs allowed",
                "params": {
                    "serverSelectionTimeoutMS": 15000,
                    "connectTimeoutMS": 15000,
                    "socketTimeoutMS": 15000,
                    "maxPoolSize": 1,
                    "retryWrites": True,
                    "tlsAllowInvalidCertificates": True,
                    "tlsAllowInvalidHostnames": True
                }
            },
            {
                "name": "Basic connection",
                "params": {
                    "serverSelectionTimeoutMS": 10000,
                    "connectTimeoutMS": 10000,
                    "socketTimeoutMS": 10000,
                    "maxPoolSize": 1,
                    "retryWrites": True
                }
            }
        ]
        
        for method in connection_methods:
            try:
                print(f"🔄 Trying connection method: {method['name']}")
                client = MongoClient(MONGODB_URI, **method['params'])
                
                # Test connection immediately
                client.admin.command('ping')
                print(f"✅ MongoDB connection established using: {method['name']}")
                
                db = client.legal_assistant
                fs = gridfs.GridFS(db)
                break
                
            except Exception as e:
                print(f"❌ Method '{method['name']}' failed: {str(e)[:100]}...")
                client = None
                continue
        
        if client is None:
            raise Exception("All connection methods failed. Check MongoDB Atlas configuration.")
    
    return client, db, fs

def lambda_handler(event, context):
    # Get MongoDB connection with timeout handling
    try:
        client, db, fs = get_mongodb_connection()
    except Exception as e:
        return {
            'statusCode': HTTPStatus.SERVICE_UNAVAILABLE,
            'body': f'Database connection failed: {str(e)}'
        }
    
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        if function == 'saveDocument':
            return save_document(action_group, function, message_version, parameters, db, fs)
        elif function == 'getDocument':
            return get_document(action_group, function, message_version, parameters, db, fs)
        elif function == 'listDocuments':
            return list_documents(action_group, function, message_version, parameters, db, fs)
        else:
            raise ValueError(f"Unknown function: {function}")

    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': f'Internal Server Error: {str(e)}'
        }

def save_document(action_group, function, message_version, parameters, db, fs):
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
    
    # Handle different content types
    if isinstance(documentContent, str):
        # If it's base64 encoded file
        try:
            file_data = base64.b64decode(documentContent)
        except:
            # If it's plain text
            file_data = documentContent.encode('utf-8')
    else:
        file_data = documentContent

    # Store file using GridFS (handles any file size)
    file_id = fs.put(
        file_data,
        filename=documentName,
        metadata={
            'documentId': document_id,
            'documentType': documentType or 'legal_document',
            'uploadDate': datetime.utcnow(),
            'analysisResults': analysisResults or 'No analysis performed',
            'status': 'active'
        }
    )
    
    # Store document metadata in regular collection for fast queries
    db.documents.insert_one({
        'documentId': document_id,
        'documentName': documentName,
        'documentType': documentType or 'legal_document',
        'gridfsFileId': file_id,
        'uploadDate': datetime.utcnow(),
        'analysisResults': analysisResults or 'No analysis performed',
        'status': 'active',
        'fileSize': len(file_data)
    })
    
    print(f'Document saved successfully with ID: {document_id}')
    
    response_body = {
        'TEXT': {
            'body': f'Document "{documentName}" saved successfully with ID: {document_id}'
        }
    }
    
    return create_response(action_group, function, message_version, response_body)

def get_document(action_group, function, message_version, parameters, db, fs):
    document_id = None
    
    for param in parameters:
        if param['name'] == 'documentId':
            document_id = param['value']

    if not document_id:
        raise ValueError("Document ID is required")

    try:
        # Get document metadata
        document = db.documents.find_one({'documentId': document_id})
        
        if not document:
            response_body = {
                'TEXT': {
                    'body': f'Document with ID {document_id} not found'
                }
            }
        else:
            # Get file content from GridFS
            file_data = fs.get(document['gridfsFileId'])
            try:
                content_preview = file_data.read(200).decode('utf-8')
            except UnicodeDecodeError:
                content_preview = "[Binary file - cannot preview text content]"
            
            response_body = {
                'TEXT': {
                    'body': f"""Document Found:
Name: {document['documentName']}
Type: {document['documentType']}
Upload Date: {document['uploadDate'].strftime('%Y-%m-%d %H:%M:%S')}
File Size: {document['fileSize']} bytes
Analysis: {document['analysisResults']}
Content Preview: {content_preview}{'...' if document['fileSize'] > 200 else ''}"""
                }
            }
        
        return create_response(action_group, function, message_version, response_body)
        
    except Exception as e:
        raise Exception(f"Error retrieving document: {str(e)}")

def list_documents(action_group, function, message_version, parameters, db, fs):
    document_type = None
    
    for param in parameters:
        if param['name'] == 'documentType':
            document_type = param['value']

    try:
        # Build query
        query = {'status': 'active'}
        if document_type:
            query['documentType'] = document_type
        
        # Get documents with MongoDB's powerful querying
        documents = list(db.documents.find(query).sort('uploadDate', -1).limit(10))
        
        if not documents:
            response_body = {
                'TEXT': {
                    'body': 'No documents found matching the criteria'
                }
            }
        else:
            doc_list = []
            for doc in documents:
                size_mb = doc['fileSize'] / (1024 * 1024)
                doc_list.append(f"• {doc['documentName']} ({doc['documentType']}) - {doc['uploadDate'].strftime('%Y-%m-%d')} - {size_mb:.2f}MB")
            
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
