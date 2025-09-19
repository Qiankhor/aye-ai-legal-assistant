const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

async function testMistral() {
  console.log('🔍 Testing Mistral model with your AWS credentials...');
  
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });

  try {
    console.log('🧪 Testing Mistral 7B Instruct v0:1...');
    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:1',
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

    console.log('✅ SUCCESS! Mistral is working!');
    console.log('Response:', responseBody.outputs[0].text);
    return true;
  } catch (error) {
    console.log('❌ ERROR with Mistral:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.name);
    
    // Try different Mistral model versions
    const mistralVersions = [
      'mistral.mistral-7b-instruct-v0:2',
      'mistral.mistral-large-2402-v1:0',
      'mistral.mistral-7b-instruct-v0:0'
    ];
    
    for (const version of mistralVersions) {
      try {
        console.log(`\n🧪 Testing ${version}...`);
        const testInput = {
          modelId: version,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            prompt: 'Hello! Please respond with a simple greeting.',
            max_tokens: 50,
            temperature: 0.7,
            top_p: 0.9
          })
        };

        const testCommand = new InvokeModelCommand(testInput);
        const testResponse = await bedrockClient.send(testCommand);
        const testResponseBody = JSON.parse(new TextDecoder().decode(testResponse.body));

        console.log(`✅ SUCCESS! ${version} is working!`);
        console.log('Response:', testResponseBody.outputs[0].text);
        return true;
      } catch (testError) {
        console.log(`❌ ${version} failed:`, testError.message);
      }
    }
    
    return false;
  }
}

testMistral();
