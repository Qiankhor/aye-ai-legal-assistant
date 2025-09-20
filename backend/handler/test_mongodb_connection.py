#!/usr/bin/env python3
"""
Test script to verify MongoDB Atlas connection
Run this locally before deploying to Lambda
"""

from pymongo import MongoClient
import gridfs

MONGODB_URI = "mongodb+srv://22004854_db_user:6jh13YQAA2q3IQfu@legal-assistant-cluster.xzgmqkv.mongodb.net/?retryWrites=true&w=majority&appName=legal-assistant-cluster"

def test_connection():
    try:
        print("🔄 Testing MongoDB Atlas connection...")
        
        # Connect to MongoDB
        client = MongoClient(MONGODB_URI)
        
        # Test connection
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        
        # Test database operations
        db = client.legal_assistant
        
        # Test regular collection
        test_doc = {"test": "document", "timestamp": "2024-01-01"}
        result = db.test_collection.insert_one(test_doc)
        print(f"✅ Inserted test document with ID: {result.inserted_id}")
        
        # Test GridFS (for file storage)
        fs = gridfs.GridFS(db)
        test_file_id = fs.put(b"Hello, this is a test file!", filename="test.txt")
        print(f"✅ Stored test file with GridFS ID: {test_file_id}")
        
        # Retrieve and verify
        test_file = fs.get(test_file_id)
        content = test_file.read()
        print(f"✅ Retrieved file content: {content.decode('utf-8')}")
        
        # Cleanup
        db.test_collection.delete_one({"_id": result.inserted_id})
        fs.delete(test_file_id)
        print("✅ Cleanup completed")
        
        print("\n🎉 All tests passed! MongoDB Atlas is ready for your Lambda function.")
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Check your connection string")
        print("2. Verify your password")
        print("3. Ensure IP address is whitelisted")
        print("4. Check if cluster is still creating")

if __name__ == "__main__":
    test_connection()
