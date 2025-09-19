import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

export function useChatBotViewModel() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I\'m your AI Legal Assistant. I can help you understand legal documents, answer legal questions, and guide you through completing legal forms. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [documentAnalysisData, setDocumentAnalysisData] = useState(null);
  const [qaSession, setQaSession] = useState({
    isActive: false,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    isGeneratingQuestions: false
  });

  // Function to format document analysis for better display
  const formatDocumentAnalysis = useCallback((analysis, documentType) => {
    return `## 🎉 Document Analysis Complete!

**Document Type:** ${documentType.toUpperCase()}

${analysis}

---

## 🚀 Next Steps
Would you like me to help you complete this document? I can guide you through filling in the required information step by step.`;
  }, []);
  
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);
    
    // Add user message showing file upload
    setMessages(prev => [...prev, {
      sender: 'user',
      type: isImage ? 'image' : 'file',
      fileUrl,
      text: `📎 ${isImage ? 'Image' : 'File'}: ${file.name}`
    }]);

    // Check if it's a document that can be analyzed
    const isDocument = file.type === 'application/pdf' || 
                      file.type === 'application/msword' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.type === 'text/plain';

    if (isDocument) {
      // Show analyzing message
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `🔍 Analyzing your document "${file.name}" with AI... This may take a moment.`
      }]);

      try {
        // Upload and analyze document
        const formData = new FormData();
        formData.append('document', file);

        const response = await fetch('http://localhost:5001/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          // Parse and format the analysis properly
          const formattedAnalysis = formatDocumentAnalysis(data.analysis, data.documentType);
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: formattedAnalysis
          }]);

          // Start Q&A session for document completion
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `📝 I've analyzed your document! I can see there are some fields that need to be filled in. Would you like me to guide you through a Q&A session to complete the document? Just say "yes" to start, or ask me any questions about the analysis first.`
          }]);

          // Store document analysis data for later use
          setDocumentAnalysisData({
            analysis: data.analysis,
            documentType: data.documentType,
            originalName: data.originalName
          });
        } else {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `❌ Sorry, I couldn't analyze your document. ${data.error || 'Please try uploading a PDF, DOC, DOCX, or TXT file.'}`
          }]);
        }
      } catch (error) {
        console.error('Document analysis error:', error);
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `❌ There was an error analyzing your document. Please try again.`
        }]);
      }
    } else {
      // For non-document files, show simple acknowledgment
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `I received your ${isImage ? 'image' : 'file'}: ${file.name}. For document analysis, please upload PDF, DOC, DOCX, or TXT files.`
      }]);
    }
  }, [formatDocumentAnalysis]);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Check if we're in a Q&A session
      if (qaSession.isActive && qaSession.questions.length > 0) {
        await handleQASessionResponse(currentInput);
        return;
      }

      // Check if user wants to start Q&A session
      if (documentAnalysisData && (currentInput.toLowerCase().includes('yes') || currentInput.toLowerCase().includes('start'))) {
        await startQASession();
        return;
      }

      // Regular chat
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const response = await axios.post('http://localhost:5001/api/chat/message', {
        message: currentInput,
        conversationHistory: conversationHistory
      });

      if (response.data.response) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: response.data.response,
          timestamp: response.data.timestamp
        }]);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => setInput(e.target.value);
  const handleInputKeyDown = (e) => { if (e.key === 'Enter') handleSend(); };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioPermissionGranted(true);
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add audio message to chat
        setMessages(prev => [...prev, {
          sender: 'user',
          type: 'audio',
          audioUrl,
          text: '🎤 Voice message'
        }]);

        // Mock AI response after voice message
        setTimeout(() => {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: 'I received your voice message!'
          }]);
        }, 600);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  // Start Q&A session for document completion
  const startQASession = async () => {
    if (!documentAnalysisData) return;

    setQaSession(prev => ({ ...prev, isGeneratingQuestions: true }));
    
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: '🔄 Generating questions based on your document analysis... This may take a moment.'
    }]);

    try {
      const response = await axios.post('http://localhost:5001/api/documents/generate-questions', {
        analysis: documentAnalysisData.analysis,
        documentType: documentAnalysisData.documentType
      });

      if (response.data.success && response.data.questions) {
        setQaSession(prev => ({
          ...prev,
          isActive: true,
          questions: response.data.questions,
          currentQuestionIndex: 0,
          answers: {},
          isGeneratingQuestions: false
        }));

        // Ask the first question
        const firstQuestion = response.data.questions[0];
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `📋 **Question 1 of ${response.data.questions.length}:**\n\n${firstQuestion.question}\n\n${firstQuestion.required ? '*(Required)*' : '*(Optional)*'}\n${firstQuestion.example ? `*Example: ${firstQuestion.example}*` : ''}\n\nPlease provide your answer:`
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: '❌ Sorry, I couldn\'t generate questions for your document. Please try again or ask me specific questions about the document.'
        }]);
        setQaSession(prev => ({ ...prev, isGeneratingQuestions: false }));
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '❌ There was an error generating questions. Please try again.'
      }]);
      setQaSession(prev => ({ ...prev, isGeneratingQuestions: false }));
    }
  };

  // Handle Q&A session response
  const handleQASessionResponse = async (answer) => {
    const currentQuestion = qaSession.questions[qaSession.currentQuestionIndex];
    const newAnswers = { ...qaSession.answers, [currentQuestion.id]: answer };
    
    setQaSession(prev => ({ ...prev, answers: newAnswers }));

    // Check if there are more questions
    if (qaSession.currentQuestionIndex < qaSession.questions.length - 1) {
      const nextQuestionIndex = qaSession.currentQuestionIndex + 1;
      const nextQuestion = qaSession.questions[nextQuestionIndex];
      
      setQaSession(prev => ({ ...prev, currentQuestionIndex: nextQuestionIndex }));
      
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `✅ Got it! **Answer ${qaSession.currentQuestionIndex + 1} recorded.**\n\n📋 **Question ${nextQuestionIndex + 1} of ${qaSession.questions.length}:**\n\n${nextQuestion.question}\n\n${nextQuestion.required ? '*(Required)*' : '*(Optional)*'}\n${nextQuestion.example ? `*Example: ${nextQuestion.example}*` : ''}\n\nPlease provide your answer:`
      }]);
    } else {
      // All questions answered, generate document
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '✅ All questions answered! Generating your completed document... This may take a moment.'
      }]);

      try {
        const response = await axios.post('http://localhost:5001/api/documents/generate-document', {
          analysis: documentAnalysisData.analysis,
          answers: newAnswers,
          documentType: documentAnalysisData.documentType
        });

        if (response.data.success) {
          // Create download link
          const blob = new Blob([response.data.document], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = `completed_${documentAnalysisData.originalName}`;
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `🎉 **Document completed successfully!**\n\nYour document has been generated with all the information you provided. Click the button below to download it.\n\n[Download Document](${url})`,
            downloadUrl: url,
            fileName: `completed_${documentAnalysisData.originalName}`
          }]);

          // Reset Q&A session
          setQaSession({
            isActive: false,
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            isGeneratingQuestions: false
          });
          setDocumentAnalysisData(null);
        } else {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: '❌ Sorry, I couldn\'t generate the completed document. Please try again.'
          }]);
        }
      } catch (error) {
        console.error('Error generating document:', error);
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: '❌ There was an error generating the document. Please try again.'
        }]);
      }
    }
  };

  return {
    messages,
    input,
    isRecording,
    audioPermissionGranted,
    isLoading,
    handleSend,
    handleInputChange,
    handleInputKeyDown,
    startRecording,
    stopRecording,
    handleFileUpload
  };
}
