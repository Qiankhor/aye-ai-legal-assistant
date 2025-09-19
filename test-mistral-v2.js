const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

async function testMistralV2() {
  console.log('🔍 Testing Mistral 7B Instruct v0:2 with your AWS credentials...');
  
  const bedrockClient = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });

  try {
    console.log('🧪 Testing Mistral 7B Instruct v0:2...');
    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: 'Hello! Please respond with a simple greeting and confirm you are working.',
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    console.log('✅ SUCCESS! Mistral 7B Instruct v0:2 is working!');
    console.log('Response:', responseBody.outputs[0].text);
    return true;
  } catch (error) {
    console.log('❌ ERROR with Mistral 7B Instruct v0:2:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.name);
    console.log('Full error:', error);
    return false;
  }
}

testMistralV2();
