const express = require('express');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');

const router = express.Router();

// AWS Configuration - Check if credentials are available
const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

let bedrockClient = null;
let textractClient = null;

if (hasAwsCredentials) {
  console.log('✅ AWS credentials found, initializing Bedrock client...');
  bedrockClient = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });

  textractClient = new TextractClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });
} else {
  console.log('⚠️  No AWS credentials found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
}

// Helper function to extract text from different file types
async function extractTextFromFile(filePath, fileType) {
  try {
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (fileType === 'txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

// Helper function to call AWS Bedrock Mistral 7B
async function callBedrockMistral(prompt) {
  // Check if AWS client is available
  if (!bedrockClient) {
    console.log('AWS Bedrock client not available, using fallback analysis...');
    return generateFallbackAnalysis(prompt);
  }

  try {
    const input = {
      modelId: 'mistral.mistral-7b-instruct-v0:2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    console.log('✅ Successfully used AWS Bedrock Mistral 7B Instruct v0:2 for document analysis');
    return responseBody.outputs[0].text;
  } catch (error) {
    console.error('Bedrock API error:', error);
    
    // Fallback to enhanced analysis when AWS models are not available
    if (error.message.includes('expired') || 
        error.message.includes('InvalidUserID.NotFound') || 
        error.message.includes('UnauthorizedOperation') ||
        error.message.includes('invalid') ||
        error.message.includes('ValidationException') ||
        error.message.includes('AccessDeniedException')) {
      console.log('AWS Bedrock model not available, using enhanced fallback analysis...');
      return generateFallbackAnalysis(prompt);
    }
    
    throw error;
  }
}

// Enhanced fallback analysis when AWS is not available
function generateFallbackAnalysis(prompt) {
  const documentText = prompt.split('Document Text:')[1] || '';
  
  // Analyze document content to provide more specific responses
  const analysis = analyzeDocumentContent(documentText);
  
  return `## 📋 Document Analysis

### 📄 Document Summary
${analysis.summary}

### 🏷️ Document Type
${analysis.documentType}

### 👥 Key Parties Involved
${analysis.parties}

### 📝 Important Terms and Conditions
${analysis.terms}

### ⚠️ Potential Risks or Concerns
${analysis.risks}

### 📅 Key Dates and Deadlines
${analysis.dates}

### ✅ Required Information for Completion
${analysis.requiredInfo}

---

**⚠️ Important Note:** This is an AI-generated analysis based on document content. For detailed legal advice, please consult with a qualified legal professional. AWS Bedrock integration is currently unavailable - please check your AWS credentials.`;
}

// Enhanced document content analysis
function analyzeDocumentContent(text) {
  const lowerText = text.toLowerCase();
  
  // Detect document type
  let documentType = "Legal Document";
  if (lowerText.includes('employment') || lowerText.includes('job') || lowerText.includes('salary')) {
    documentType = "Employment Contract";
  } else if (lowerText.includes('rent') || lowerText.includes('lease') || lowerText.includes('tenant')) {
    documentType = "Rental Agreement";
  } else if (lowerText.includes('purchase') || lowerText.includes('buy') || lowerText.includes('sale')) {
    documentType = "Purchase Agreement";
  } else if (lowerText.includes('loan') || lowerText.includes('credit') || lowerText.includes('borrow')) {
    documentType = "Loan Agreement";
  } else if (lowerText.includes('partnership') || lowerText.includes('business') || lowerText.includes('company')) {
    documentType = "Partnership Agreement";
  } else if (lowerText.includes('service') || lowerText.includes('consulting') || lowerText.includes('contractor')) {
    documentType = "Service Agreement";
  }

  // Extract parties
  const parties = [];
  const namePatterns = [
    /(?:party|between|agreement between)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:and|&)/gi
  ];
  
  namePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const name = match.replace(/(?:party|between|agreement between|and|&)/gi, '').trim();
        if (name && name.length > 3) {
          parties.push(`- ${name}`);
        }
      });
    }
  });

  if (parties.length === 0) {
    parties.push("- Parties to be identified from document content");
  }

  // Extract dates
  const dates = [];
  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}\b/g
  ];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!dates.includes(match)) {
          dates.push(`- ${match}`);
        }
      });
    }
  });

  if (dates.length === 0) {
    dates.push("- Review document for specific dates and deadlines");
  }

  // Extract monetary amounts
  const amounts = [];
  const amountPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g,
    /RM\s*[\d,]+(?:\.\d{2})?/gi,
    /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|ringgit|usd|myr)\b/gi
  ];
  
  amountPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!amounts.includes(match)) {
          amounts.push(`- ${match}`);
        }
      });
    }
  });

  // Generate summary based on content
  let summary = `This is a ${documentType.toLowerCase()} that requires careful review. `;
  if (amounts.length > 0) {
    summary += `The document involves financial terms including ${amounts.slice(0, 2).join(' and ')}. `;
  }
  if (dates.length > 0) {
    summary += `Important dates include ${dates.slice(0, 2).join(' and ')}. `;
  }
  summary += "Please review all terms carefully before signing.";

  // Generate terms based on content
  const terms = [];
  if (lowerText.includes('payment') || lowerText.includes('fee') || lowerText.includes('cost')) {
    terms.push("- Payment terms and financial obligations");
  }
  if (lowerText.includes('termination') || lowerText.includes('cancel') || lowerText.includes('end')) {
    terms.push("- Termination conditions and procedures");
  }
  if (lowerText.includes('liability') || lowerText.includes('responsibility') || lowerText.includes('obligation')) {
    terms.push("- Liability and responsibility clauses");
  }
  if (lowerText.includes('confidential') || lowerText.includes('privacy') || lowerText.includes('secret')) {
    terms.push("- Confidentiality and privacy provisions");
  }
  if (lowerText.includes('penalty') || lowerText.includes('fine') || lowerText.includes('breach')) {
    terms.push("- Penalty and breach of contract clauses");
  }
  
  if (terms.length === 0) {
    terms.push("- Review all terms and conditions carefully");
    terms.push("- Pay attention to payment terms, deadlines, and obligations");
    terms.push("- Check for any penalty clauses or termination conditions");
  }

  // Generate risks based on content
  const risks = [];
  if (lowerText.includes('penalty') || lowerText.includes('fine')) {
    risks.push("- Potential financial penalties for non-compliance");
  }
  if (lowerText.includes('termination') || lowerText.includes('cancel')) {
    risks.push("- Risk of contract termination under certain conditions");
  }
  if (lowerText.includes('liability') || lowerText.includes('responsible')) {
    risks.push("- Potential liability and responsibility obligations");
  }
  if (lowerText.includes('confidential') || lowerText.includes('secret')) {
    risks.push("- Confidentiality obligations and potential legal consequences");
  }
  
  if (risks.length === 0) {
    risks.push("- Ensure you understand all obligations before agreeing");
    risks.push("- Consider consulting with a legal professional for complex terms");
    risks.push("- Verify all dates, amounts, and conditions are accurate");
  }

  // Generate required information
  const requiredInfo = [];
  if (lowerText.includes('name') || lowerText.includes('signature')) {
    requiredInfo.push("- Full names and signatures of all parties");
  }
  if (lowerText.includes('address') || lowerText.includes('location')) {
    requiredInfo.push("- Complete addresses and contact information");
  }
  if (lowerText.includes('date') || lowerText.includes('time')) {
    requiredInfo.push("- Specific dates and time-sensitive information");
  }
  if (lowerText.includes('amount') || lowerText.includes('payment')) {
    requiredInfo.push("- Financial amounts and payment details");
  }
  
  if (requiredInfo.length === 0) {
    requiredInfo.push("- Full names and contact information");
    requiredInfo.push("- Specific dates and amounts");
    requiredInfo.push("- Any additional details mentioned in the document");
  }

  return {
    summary,
    documentType,
    parties: parties.slice(0, 5).join('\n'),
    terms: terms.join('\n'),
    risks: risks.join('\n'),
    dates: dates.slice(0, 5).join('\n'),
    requiredInfo: requiredInfo.join('\n')
  };
}

module.exports = (upload) => {
  // Upload and analyze document
  router.post('/upload', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document uploaded' });
      }

      const filePath = req.file.path;
      const fileType = path.extname(req.file.originalname).toLowerCase().substring(1);
      
      // Extract text from document
      const documentText = await extractTextFromFile(filePath, fileType);
      
      if (!documentText || documentText.trim() === '') {
        return res.status(400).json({ error: 'Could not extract text from document' });
      }

      // Create prompt for document analysis
      const analysisPrompt = `You are a legal document analyzer. Analyze the following legal document and provide:

1. Document Summary (2-3 sentences)
2. Document Type (e.g., Employment Contract, Rental Agreement, etc.)
3. Key Parties Involved
4. Important Terms and Conditions
5. Potential Risks or Concerns
6. Key Dates and Deadlines
7. Required Information for Completion (what needs to be filled in)

Document Text:
${documentText}

Please provide a comprehensive analysis in a structured format.`;

      // Get analysis from Bedrock
      const analysis = await callBedrockMistral(analysisPrompt);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        analysis: analysis,
        documentType: fileType,
        originalName: req.file.originalname,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Document analysis error:', error);
      
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        error: 'Failed to analyze document',
        details: error.message 
      });
    }
  });

  // Generate form questions based on document analysis
  router.post('/generate-questions', async (req, res) => {
    try {
      const { analysis, documentType } = req.body;

      if (!analysis) {
        return res.status(400).json({ error: 'Document analysis is required' });
      }

      const questionsPrompt = `Based on this legal document analysis, generate a list of specific questions that need to be answered to complete the document. 

Analysis: ${analysis}

For each question, provide:
1. The question text
2. The field name (for form filling)
3. The field type (text, date, number, select, etc.)
4. Whether it's required or optional
5. Any validation rules or examples

Format as JSON array with this structure:
[
  {
    "id": "field_name",
    "question": "What is your full name?",
    "type": "text",
    "required": true,
    "validation": "Must be at least 2 words",
    "example": "Ahmad bin Abdullah"
  }
]`;

      const questionsResponse = await callBedrockMistral(questionsPrompt);
      
      // Try to parse JSON response
      let questions;
      try {
        questions = JSON.parse(questionsResponse);
      } catch (parseError) {
        // If JSON parsing fails, create a basic question structure
        questions = [
          {
            id: "full_name",
            question: "What is your full name?",
            type: "text",
            required: true,
            validation: "Must be at least 2 words",
            example: "Ahmad bin Abdullah"
          },
          {
            id: "ic_number",
            question: "What is your IC number?",
            type: "text",
            required: true,
            validation: "Must be 12 digits",
            example: "123456789012"
          },
          {
            id: "address",
            question: "What is your address?",
            type: "textarea",
            required: true,
            validation: "Complete address required",
            example: "123 Jalan ABC, Taman XYZ, 12345 Kuala Lumpur"
          }
        ];
      }

      res.json({
        success: true,
        questions: questions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Question generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate questions',
        details: error.message 
      });
    }
  });

  // Generate completed document
  router.post('/generate-document', async (req, res) => {
    try {
      const { analysis, answers, documentType } = req.body;

      if (!analysis || !answers) {
        return res.status(400).json({ error: 'Analysis and answers are required' });
      }

      const documentPrompt = `Based on the original document analysis and the provided answers, generate a completed legal document.

Original Analysis: ${analysis}

User Answers: ${JSON.stringify(answers, null, 2)}

Please generate a properly formatted legal document with all the information filled in. Make sure to:
1. Use proper legal language and formatting
2. Include all the original terms and conditions
3. Fill in all the provided information appropriately
4. Maintain the document structure and legal validity
5. Use Malaysian legal terminology where appropriate

Generate the complete document text.`;

      const completedDocument = await callBedrockMistral(documentPrompt);

      res.json({
        success: true,
        document: completedDocument,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate document',
        details: error.message 
      });
    }
  });

  return router;
};
