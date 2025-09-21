from http import HTTPStatus
import boto3
import uuid
import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('toDoList')

def lambda_handler(event,context):
    try:
        action_group = event['actionGroup']
        function = event['function']
        message_version = event.get('messageVersion', '1')
        parameters = event.get('parameters', [])

        emailAddress = None
        taskDescription = None
        emailContext = None
        documentTitle = None
        status = None
        for param in parameters:
            if param['name'] == 'emailAddress':
                emailAddress = param['value']
            elif param['name'] == 'taskDescription':
                taskDescription = param['value']
            elif param['name'] == 'emailContext':
                emailContext = param['value']
            elif param['name'] == 'documentTitle':
                documentTitle = param['value']
            elif param['name'] == 'status':
                status = param['value']
        # Generate unique ID and timestamp
        todo_id = f"todo-{int(datetime.datetime.now().timestamp() * 1000)}-{str(uuid.uuid4())[:8]}"
        created_at = datetime.datetime.now().isoformat() + 'Z'
        
        item = {
            'id': todo_id,
            'task': taskDescription or 'No description provided',
            'emailAddress': emailAddress or 'default@example.com',
            'taskDescription': taskDescription or 'No description provided',
            'emailContext': emailContext or 'No context provided',
            'documentTitle': documentTitle or 'No document specified',
            'status': status or 'pending',
            'completed': False,
            'createdAt': created_at,
            'dueDate': (datetime.datetime.now() + datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        }
        table.put_item(Item=item)
        print('Item saved succesfully')
        response_body = {
            'TEXT':{
                'body': 'Item added to DynamoDB'
            }  
        }
        action_response = {
            'actionGroup': action_group,
            'function': function,
            'functionResponse':{
                'responseBody': response_body
            }
        }
        response = {
            'response': action_response,
            'messageVersion': message_version
        }
        return response
    except KeyError as e:
        print(f'Missing required field: {str(e)}')
        return {
            'statusCode':HTTPStatus.BAD_REQUEST,
            'body': f'Error:{str(e)}'
        }
    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        return {
            'statusCode':HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': 'Internal Server Error'
        }