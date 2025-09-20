#!/usr/bin/env python3
"""
Test script for MongoDB document storage
Use this to test your document storage before integrating with Bedrock agent
"""

import json
from document_storage_mongodb import lambda_handler

def test_save_document():
    """Test saving a document"""
    print("🔄 Testing document save...")
    
    event = {
        'actionGroup': 'document_storage_action_group',
        'function': 'saveDocument',
        'messageVersion': '1',
        'parameters': [
            {'name': 'documentName', 'value': 'test_contract.txt'},
            {'name': 'documentContent', 'value': 'This is a test legal contract with important clauses...'},
            {'name': 'documentType', 'value': 'contract'},
            {'name': 'analysisResults', 'value': 'Contract appears to be standard employment agreement'}
        ]
    }
    
    context = {}  # Mock context
    
    try:
        result = lambda_handler(event, context)
        print("✅ Save test passed!")
        print(f"Response: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"❌ Save test failed: {str(e)}")
        return None

def test_list_documents():
    """Test listing documents"""
    print("\n🔄 Testing document list...")
    
    event = {
        'actionGroup': 'document_storage_action_group',
        'function': 'listDocuments',
        'messageVersion': '1',
        'parameters': []
    }
    
    context = {}
    
    try:
        result = lambda_handler(event, context)
        print("✅ List test passed!")
        print(f"Response: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"❌ List test failed: {str(e)}")
        return None

def test_get_document(document_id):
    """Test getting a specific document"""
    print(f"\n🔄 Testing document retrieval for ID: {document_id}")
    
    event = {
        'actionGroup': 'document_storage_action_group',
        'function': 'getDocument',
        'messageVersion': '1',
        'parameters': [
            {'name': 'documentId', 'value': document_id}
        ]
    }
    
    context = {}
    
    try:
        result = lambda_handler(event, context)
        print("✅ Get test passed!")
        print(f"Response: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"❌ Get test failed: {str(e)}")
        return None

def run_all_tests():
    """Run all tests"""
    print("🧪 Starting MongoDB Document Storage Tests")
    print("=" * 50)
    
    # Test 1: Save document
    save_result = test_save_document()
    if not save_result:
        print("❌ Cannot continue tests - save failed")
        return
    
    # Extract document ID from save response (if available)
    document_id = None
    try:
        response_body = save_result['response']['functionResponse']['responseBody']['TEXT']['body']
        # Extract ID from response like "Document saved successfully with ID: abc-123"
        if "ID: " in response_body:
            document_id = response_body.split("ID: ")[1]
            print(f"📝 Extracted document ID: {document_id}")
    except:
        print("⚠️ Could not extract document ID from response")
    
    # Test 2: List documents
    test_list_documents()
    
    # Test 3: Get document (if we have an ID)
    if document_id:
        test_get_document(document_id)
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    run_all_tests()
