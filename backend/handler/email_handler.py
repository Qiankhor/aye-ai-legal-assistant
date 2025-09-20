from http import HTTPStatus
import boto3
import json

# Initialize SES client
ses = boto3.client('ses', region_name='us-east-1')

def generate_simple_defaults(context, document_title=None, recipient_name=None, sender_name=None):
    """
    Generate simple default subject and body - let the AI agent handle the sophistication
    """
    
    # Simple, clean defaults that the agent can enhance
    if document_title:
        subject = f"Re: {document_title}"
        body = f"Dear {recipient_name or 'Sir/Madam'},\n\nRegarding {document_title} - {context}.\n\nBest regards,\n{sender_name or 'Legal Team'}"
    else:
        subject = f"Legal Document - {context.title()}"
        body = f"Dear {recipient_name or 'Sir/Madam'},\n\n{context.capitalize()}.\n\nBest regards,\n{sender_name or 'Legal Team'}"
    
    return {
        'subject': subject,
        'body': body
    }

def lambda_handler(event, context):
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        # Extract parameters (limited to 5 for AWS quota)
        recipientEmail = None
        subject = None
        body = None
        documentTitle = None
        emailContext = None  # Keep context for better email composition
        
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

        # Validate required parameters
        if not recipientEmail:
            raise ValueError("Recipient email is required")
        
        # Set default values
        senderEmail = "deon140203@gmail.com"  # Replace with your verified SES email
        senderName = "Legal Team"
        
        # Generate simple defaults - let the AI agent handle the sophistication
        if not subject or not body:
            generated_content = generate_simple_defaults(
                emailContext or "document review",
                documentTitle,
                None,  # recipientName - will be handled by agent
                senderName
            )
            if not subject:
                subject = generated_content['subject']
            if not body:
                body = generated_content['body']

        # Send email using SES
        response = ses.send_email(
            Source=senderEmail,
            Destination={
                'ToAddresses': [recipientEmail]
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': body,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': f"""
                        <html>
                        <body>
                            <h3>Legal Document Notification</h3>
                            <p>{body}</p>
                            {f'<p><strong>Document:</strong> {documentTitle}</p>' if documentTitle else ''}
                            <p><em>This email was sent via Legal CRM Assistant</em></p>
                        </body>
                        </html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )

        print(f'Email sent successfully. MessageId: {response["MessageId"]}')
        
        # Create success response
        response_body = {
            'TEXT': {
                'body': f'Email sent successfully to {recipientEmail}'
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
