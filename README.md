# AI Legal Assistant for the Rakyat

An AI-powered legal assistant designed to make legal documents accessible and understandable for Malaysian citizens. This application helps users understand legal documents, answer legal questions, and complete legal forms through an intuitive chat interface and document analysis workflow.

## Features

### 🤖 Legal Q&A Chat
- Interactive chatbot powered by OpenAI GPT-3.5
- Answers general legal questions in simple, understandable language
- Provides guidance on legal concepts and rights
- Supports voice input and file attachments

### 📄 Document Analysis & Completion
- Upload legal documents (PDF, DOC, DOCX, TXT)
- AI-powered document analysis using AWS Bedrock Mistral 7B
- Automatic extraction of key information, risks, and required fields
- Interactive form filling workflow
- Generate completed legal documents

### 🛡️ Key Capabilities
- Document summarization and risk assessment
- Identification of important clauses and deadlines
- Interactive question-answer workflow for form completion
- Download completed documents
- Malaysian legal terminology support

## Technology Stack

### Frontend
- React 19.1.1
- Material-UI (MUI) for UI components
- Axios for API calls

### Backend
- Node.js with Express.js
- OpenAI API for chat functionality
- AWS Bedrock (Mistral 7B) for document analysis
- AWS Textract for document text extraction
- Multer for file uploads
- PDF-parse and Mammoth for document processing

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key
- AWS credentials with Bedrock access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aye-ai-legal-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
OPENAI_API_KEY=your_openai_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SESSION_TOKEN=your_aws_session_token
AWS_REGION=ap-southeast-1
PORT=5000
```

## Running the Application

### Development Mode
Start both frontend and backend:
```bash
npm run dev
```

Or start them separately:

Backend server:
```bash
npm run server
```

Frontend (in another terminal):
```bash
npm start
```

### Production Mode
Build and start:
```bash
npm run build
npm run server
```

## Usage

### Legal Q&A Chat
1. Open the application in your browser
2. Click on the "Legal Q&A Chat" tab
3. Type your legal questions or use voice input
4. Get AI-powered responses and guidance

### Document Analysis & Completion
1. Click on the "Document Analysis & Completion" tab
2. Upload a legal document (PDF, DOC, DOCX, or TXT)
3. Review the AI-generated analysis and summary
4. Answer the interactive questions to complete the form
5. Generate and download your completed document

## API Endpoints

### Chat API
- `POST /api/chat/message` - Send a message to the AI assistant
- `GET /api/chat/document-types` - Get available document types
- `GET /api/chat/common-questions` - Get common legal questions

### Document API
- `POST /api/documents/upload` - Upload and analyze a document
- `POST /api/documents/generate-questions` - Generate form questions
- `POST /api/documents/generate-document` - Generate completed document

## Security Notes

- API keys are stored in environment variables
- File uploads are limited to 10MB
- Only supported document formats are accepted
- All AI responses include disclaimers about professional legal advice

## Legal Disclaimer

This AI assistant provides general legal information and guidance only. It should not be considered as professional legal advice. Users are advised to consult with qualified legal professionals for specific legal matters.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.