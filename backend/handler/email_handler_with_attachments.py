from http import HTTPStatus
import boto3
import json
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import pymongo
from gridfs import GridFS
import os
from datetime import datetime

# Initialize SES client
ses = boto3.client('ses', region_name='us-east-1')

def get_mongodb_connection():
    """Get MongoDB connection for file retrieval"""
    try:
        # Clean up MongoDB URI for Python compatibility
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable not set")
        
        # Remove Node.js specific parameters
        mongodb_uri = mongodb_uri.replace('&ssl_cert_reqs=CERT_NONE', '')
        
        client = pymongo.MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000
        )
        
        db = client['legal-assistant']
        fs = GridFS(db, collection='fs')
        
        return db, fs, client
    except Exception as e:
        print(f"MongoDB connection error: {str(e)}")
        return None, None, None

def get_file_from_mongodb(document_title):
    """Retrieve file from MongoDB GridFS by document title"""
    try:
        db, fs, client = get_mongodb_connection()
        if not db:
            return None
        
        # Find document by name (case-insensitive)
        document = db.documents.find_one({
            'documentName': {'$regex': document_title, '$options': 'i'},
            'status': 'active'
        })
        
        if not document:
            print(f"Document not found: {document_title}")
            return None
        
        # Get file from GridFS
        try:
            file_data = fs.get(document['gridfsFileId'])
            file_content = file_data.read()
            
            return {
                'filename': document['documentName'],
                'content': file_content,
                'content_type': 'application/octet-stream',
                'size': len(file_content)
            }
        except Exception as e:
            print(f"Error retrieving file from GridFS: {str(e)}")
            return None
        finally:
            if client:
                client.close()
                
    except Exception as e:
        print(f"Error getting file from MongoDB: {str(e)}")
        return None

def create_email_with_attachment(sender_email, recipient_email, subject, body, attachment_data=None):
    """Create email message with optional attachment"""
    
    # Create multipart message
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    
    # Add body to email
    html_body = f"""
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h3 style="color: #2c3e50;">Legal Document Notification</h3>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                {body.replace(chr(10), '<br>')}
            </div>
            {f'<p style="color: #7f8c8d;"><strong>📎 Attachment:</strong> {attachment_data["filename"]} ({attachment_data["size"]} bytes)</p>' if attachment_data else ''}
            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px;">
                <em>This email was sent via Legal CRM Assistant</em><br>
                <em>Sent on {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</em>
            </p>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(html_body, 'html'))
    
    # Add attachment if provided
    if attachment_data:
        attachment = MIMEApplication(attachment_data['content'])
        attachment.add_header(
            'Content-Disposition', 
            'attachment', 
            filename=attachment_data['filename']
        )
        msg.attach(attachment)
    
    return msg

def lambda_handler(event, context):
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        # Extract parameters
        recipientEmail = None
        subject = None
        body = None
        documentTitle = None
        emailContext = None
        attachFile = False  # New parameter to control attachment
        
        for param in parameters:
            if param['name'] == 'recipientEmail':
                recipientEmail = param['value']
            elif param['name'] == 'subject':
                subject = param['value']
            elif param['name'] == 'body':
                body = param['value']
            elif param['name'] == 'documentTitle':
                documentTitle = param['value']
            elif param['name'] == 'emailContext':
                emailContext = param['value']
            elif param['name'] == 'attachFile':
                attachFile = str(param['value']).lower() in ['true', '1', 'yes']

        # Validate required parameters
        if not recipientEmail:
            raise ValueError("Recipient email is required")
        
        # Set default values
        senderEmail = "deon140203@gmail.com"  # Replace with your verified SES email
        
        # Generate defaults if needed
        if not subject:
            subject = f"Re: {documentTitle}" if documentTitle else "Legal Document Notification"
        
        if not body:
            body = f"Please find the document information below.\n\nDocument: {documentTitle}\nContext: {emailContext}\n\nBest regards,\nLegal Team"

        # Get file attachment if requested and document title provided
        attachment_data = None
        if attachFile and documentTitle:
            print(f"📎 Attempting to attach file: {documentTitle}")
            attachment_data = get_file_from_mongodb(documentTitle)
            if attachment_data:
                print(f"✅ File attached: {attachment_data['filename']} ({attachment_data['size']} bytes)")
            else:
                print(f"⚠️ Could not attach file: {documentTitle}")

        # Create email message
        email_msg = create_email_with_attachment(
            senderEmail, 
            recipientEmail, 
            subject, 
            body, 
            attachment_data
        )

        # Send email using SES
        response = ses.send_raw_email(
            Source=senderEmail,
            Destinations=[recipientEmail],
            RawMessage={'Data': email_msg.as_string()}
        )

        print(f'Email sent successfully. MessageId: {response["MessageId"]}')
        
        # Create success response
        attachment_info = f" with attachment {attachment_data['filename']}" if attachment_data else ""
        response_body = {
            'TEXT': {
                'body': f'Email sent successfully to {recipientEmail}{attachment_info}'
            }
        }
        
        action_response = {
            'actionGroup': action_group,
            'function': function,
            'functionResponse': {
                'responseBody': response_body
            }
        }
        
        response = {
            'response': action_response,
            'messageVersion': message_version
        }
        
        return response

    except ValueError as e:
        print(f'Validation error: {str(e)}')
        return {
            'statusCode': HTTPStatus.BAD_REQUEST,
            'body': f'Validation Error: {str(e)}'
        }
    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': f'Internal Server Error: {str(e)}'
        }
