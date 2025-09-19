#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 AI Legal Assistant - Environment Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  console.log('📝 Current .env content:');
  console.log('------------------------');
  console.log(fs.readFileSync(envPath, 'utf8'));
} else {
  console.log('📝 Creating .env file...');
  
  const envContent = `# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# AWS Credentials for Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_SESSION_TOKEN=your_aws_session_token_here
AWS_REGION=ap-southeast-1

# Server Port
PORT=5001`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
}

console.log('\n📋 Next Steps:');
console.log('1. Get your AWS credentials from AWS Console:');
console.log('   - Go to https://console.aws.amazon.com/');
console.log('   - Navigate to IAM → Users → Create user');
console.log('   - Attach policy: AmazonBedrockFullAccess');
console.log('   - Create access keys');
console.log('2. Get your OpenAI API key from:');
console.log('   - https://platform.openai.com/api-keys');
console.log('3. Update the .env file with your actual credentials');
console.log('4. Restart the server: npm run server');
console.log('\n🎯 Once configured, the system will use AWS Bedrock Mistral 7B for real document analysis!');
