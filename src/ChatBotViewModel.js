import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result
        .replace('data:', '')
        .replace(/^.+,/, '');
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Common languages with their codes
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ms-MY', name: 'Malay' },
];

export function useChatBotViewModel() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I\'m your AI Legal Assistant. I can help you understand legal documents, answer legal questions, guide you through completing legal forms, and process voice messages. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  
  // Document analysis states
  const [documentAnalysisData, setDocumentAnalysisData] = useState(null);
  const [qaSession, setQaSession] = useState({
    isActive: false,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    isGeneratingQuestions: false
  });

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // Function to format document analysis for better display
  const formatDocumentAnalysis = useCallback((analysis, documentName) => {
    return `## 🎉 Document Analysis Complete!

**Document:** ${documentName}

${analysis}

---

## 🚀 Next Steps
Would you like me to help you complete this document? I can guide you through filling in the required information step by step.`;
  }, []);
  
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    
    // Handle audio files for speech-to-text
    if (file.type.startsWith('audio/')) {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('languageCode', selectedLanguage);

      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:3001/api/speech-to-text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to transcribe audio');
        }

        const data = await response.json();
        let transcription = '';
        if (data.transcription) {
          transcription = data.transcription;
        } else if (data.results) {
          transcription = data.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        }

        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `📝 **Transcription:** ${transcription}`
        }]);

        // Process transcribed text through chat API
        if (transcription.trim()) {
          await processTextMessage(transcription);
        }
      } catch (error) {
        console.error('Error transcribing audio:', error);
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: 'Sorry, I had trouble transcribing that audio file.'
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

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

      setIsLoading(true);
      try {
        // Upload and analyze document
        const formData = new FormData();
        formData.append('document', file);

        const response = await fetch('http://localhost:3001/api/documents/analyze', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          // Parse and format the analysis properly
          const formattedAnalysis = formatDocumentAnalysis(data.documentSummary || data.analysis, data.documentName);
          
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
            analysis: data.documentSummary || data.analysis,
            documentType: data.documentName,
            originalName: data.documentName,
            formFields: data.formFields || [],
            questions: data.questions || []
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
      } finally {
        setIsLoading(false);
      }
    } else {
      // For non-document files, show simple acknowledgment
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `I received your ${isImage ? 'image' : 'file'}: ${file.name}. For document analysis, please upload PDF, DOC, DOCX, or TXT files. For audio transcription, upload audio files.`
      }]);
    }
  }, [formatDocumentAnalysis, selectedLanguage]);

  // Process text message through chat API
  const processTextMessage = async (messageText) => {
    setIsLoading(true);
    try {
      // Check if we're in a Q&A session
      if (qaSession.isActive && qaSession.questions.length > 0) {
        await handleQASessionResponse(messageText);
        return;
      }

      // Check if user wants to start Q&A session
      if (documentAnalysisData && (messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('start'))) {
        await startQASession();
        return;
      }

      // Regular chat
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const response = await axios.post('http://localhost:3001/api/chat', {
        message: messageText,
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    
    await processTextMessage(currentInput);
  };

  // Programmatically send a text message into the chatbot (used by floating Ask AI)
  const sendDirectText = async (messageText) => {
    if (!messageText || !messageText.trim()) return;
    const userMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    await processTextMessage(messageText);
  };

  // Prefill the input field without sending (used by floating Ask AI)
  const prefillInput = (messageText) => {
    if (typeof messageText !== 'string') return;
    setInput(messageText);
  };

  const handleInputChange = (e) => setInput(e.target.value);
  const handleInputKeyDown = (e) => { if (e.key === 'Enter') handleSend(); };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioPermissionGranted(true);
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000
      });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
  const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm;codecs=opus' });
  setIsLoading(true);

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('languageCode', selectedLanguage);

    const response = await fetch('http://localhost:3001/api/speech-to-text', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    let transcription = '';
    if (data.transcription) {
      transcription = data.transcription;
    } else if (data.results) {
      transcription = data.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    }

    if (!transcription) {
      throw new Error('No transcription received from backend');
    }

    // ✅ Instead of sending it immediately, place into input
    setInput(transcription);

  } catch (error) {
    console.error('Error transcribing audio:', error);
    setMessages(prev => [...prev, {
      sender: 'bot',
      text: 'Sorry, I had trouble transcribing your voice message.'
    }]);
  } finally {
    setIsLoading(false);
  }
};


      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  }, [selectedLanguage, messages]);

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
      // Questions are already generated in the analysis response
      if (documentAnalysisData.questions && documentAnalysisData.questions.length > 0) {
        const response = { data: { success: true, questions: documentAnalysisData.questions } };

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
            text: `📋 **Question 1 of ${response.data.questions.length}:**\n\n${firstQuestion.question}\n\n${firstQuestion.required ? '*(Required)*' : '*(Optional)*'}\n${firstQuestion.example ? `*Example: ${firstQuestion.example}*` : ''}\n\nPlease provide your answer (you can type or use voice):`
          }]);
        } else {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: '❌ Sorry, I couldn\'t generate questions for your document. Please try again or ask me specific questions about the document.'
          }]);
          setQaSession(prev => ({ ...prev, isGeneratingQuestions: false }));
        }
      } else {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: '❌ No questions were generated for this document. It may already be complete or there was an issue with the analysis.'
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
        text: `✅ Got it! **Answer ${qaSession.currentQuestionIndex + 1} recorded.**\n\n📋 **Question ${nextQuestionIndex + 1} of ${qaSession.questions.length}:**\n\n${nextQuestion.question}\n\n${nextQuestion.required ? '*(Required)*' : '*(Optional)*'}\n${nextQuestion.example ? `*Example: ${nextQuestion.example}*` : ''}\n\nPlease provide your answer (you can type or use voice):`
      }]);
    } else {
      // All questions answered, generate document
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '✅ All questions answered! Generating your completed document... This may take a moment.'
      }]);

      try {
        const response = await axios.post('http://localhost:3001/api/documents/generate', {
          documentName: documentAnalysisData.originalName,
          filledFields: Object.entries(newAnswers).map(([key, value]) => ({ key, value })),
          originalFields: documentAnalysisData.formFields || []
        });

        if (response.status === 200) {
          // Create download link from response data
          const blob = new Blob([response.data], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `🎉 **Document completed successfully!**\n\nYour document has been generated with all the information you provided. Click the button below to download it.`,
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
    selectedLanguage,
    setSelectedLanguage,
    LANGUAGES,
    qaSession,
    documentAnalysisData,
    handleSend,
    handleInputChange,
    handleInputKeyDown,
    startRecording,
    stopRecording,
    handleFileUpload,
    sendDirectText,
    prefillInput
  };
}