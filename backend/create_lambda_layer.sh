#!/bin/bash
# Script to create Lambda layer with pymongo

echo "🔄 Creating Lambda layer with pymongo..."

# Create directory structure
mkdir -p lambda-layer/python

# Install pymongo in the layer directory
pip install pymongo -t lambda-layer/python/

# Create zip file for Lambda layer
cd lambda-layer
zip -r ../pymongo-layer.zip .
cd ..

echo "✅ Lambda layer created: pymongo-layer.zip"
echo ""
echo "📋 Next steps:"
echo "1. Upload pymongo-layer.zip to AWS Lambda Layers"
echo "2. Add the layer to your Lambda function"
echo ""
echo "AWS CLI commands:"
echo "aws lambda publish-layer-version \\"
echo "  --layer-name pymongo-layer \\"
echo "  --zip-file fileb://pymongo-layer.zip \\"
echo "  --compatible-runtimes python3.9 python3.10 python3.11"
