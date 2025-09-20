#!/bin/bash
# Simple deployment without Lambda layers

echo "📦 Creating deployment package..."

# Create clean deployment directory
rm -rf deployment-package
mkdir deployment-package

# Install dependencies directly in package
echo "⬇️ Installing dependencies..."
python3 -m pip install pymongo dnspython -t deployment-package/ --quiet

# Copy your function code
echo "📝 Copying function code..."
cp handler/document_storage_mongodb.py deployment-package/lambda_function.py

# Create zip file
echo "🗜️ Creating zip file..."
cd deployment-package
zip -r ../document-storage-mongodb.zip . --quiet
cd ..

echo "✅ Deployment package created: document-storage-mongodb.zip"
echo ""
echo "📋 Next steps:"
echo "1. Upload document-storage-mongodb.zip to your Lambda function"
echo "2. Set handler to: lambda_function.lambda_handler"
echo "3. Set MONGODB_URI environment variable"
echo ""
echo "AWS CLI command:"
echo "aws lambda update-function-code \\"
echo "  --function-name YOUR_FUNCTION_NAME \\"
echo "  --zip-file fileb://document-storage-mongodb.zip"
