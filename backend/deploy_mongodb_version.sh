#!/bin/bash
# Deployment script for MongoDB version

echo "🚀 Deploying MongoDB version of document storage..."

# Step 1: Create Lambda layer with pymongo
echo "📦 Creating Lambda layer..."
./create_lambda_layer.sh

# Step 2: Upload layer to AWS (replace with your actual layer name)
echo "☁️ Uploading layer to AWS..."
aws lambda publish-layer-version \
  --layer-name pymongo-layer \
  --zip-file fileb://pymongo-layer.zip \
  --compatible-runtimes python3.9 python3.10 python3.11

# Step 3: Get the layer ARN (you'll need this)
echo "📋 Getting layer ARN..."
LAYER_ARN=$(aws lambda list-layer-versions --layer-name pymongo-layer --query 'LayerVersions[0].LayerVersionArn' --output text)
echo "Layer ARN: $LAYER_ARN"

# Step 4: Update your Lambda function to use the layer
echo "🔧 Updating Lambda function..."
# Replace 'your-lambda-function-name' with your actual function name
aws lambda update-function-configuration \
  --function-name your-document-storage-function \
  --layers $LAYER_ARN

# Step 5: Update function code
echo "📝 Updating function code..."
zip -j function.zip handler/document_storage_mongodb.py
aws lambda update-function-code \
  --function-name your-document-storage-function \
  --zip-file fileb://function.zip

# Step 6: Set environment variable
echo "🔐 Setting MongoDB connection string..."
read -p "Enter your MongoDB connection string: " MONGODB_URI
aws lambda update-function-configuration \
  --function-name your-document-storage-function \
  --environment Variables="{MONGODB_URI=$MONGODB_URI}"

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the function in AWS Lambda console"
echo "2. Update your Bedrock agent to use the new function"
echo "3. Test with your agent"
