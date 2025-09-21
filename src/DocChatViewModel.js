import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Common languages with their codes
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ms-MY', name: 'Malay' },
];

// Document-specific suggestion messages for legal analysis
const DOC_SUGGESTION_MESSAGES = [
  "Summarize the document",
  "Risk Detector - Flag unfair or unusual terms with color-coded risk levels",
  "What are my key obligations in this document?",
  "What are the termination clauses?",
];

export function useDocChatViewModel() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! Upload a document on the Home page or attach it here, then ask questions. I will answer grounded in the uploaded document.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [sessionId, setSessionId] = useState(null);
  const [documentName, setDocumentName] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const prefillInput = (messageText) => {
    if (typeof messageText !== 'string') return;
    setInput(messageText);
  };

  const startSessionWithFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('document', file);
      setIsLoading(true);

      const response = await fetch('http://localhost:3001/api/doc-chat/sessions/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create document chat session');
      }
      setSessionId(data.sessionId);
      setDocumentName(data.documentName);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `📄 Document "${data.documentName}" is ready. Ask your questions and I'll answer using the document.`
      }]);
    } catch (error) {
      console.error('startSessionWithFile error:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '❌ There was an error preparing the document for Q&A.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startSessionWithText = useCallback(async (documentText, name = 'Document') => {
    if (!documentText || !documentText.trim()) return;
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:3001/api/doc-chat/sessions/text', {
        documentText,
        documentName: name
      });
      if (response.data && response.data.success) {
        setSessionId(response.data.sessionId);
        setDocumentName(response.data.documentName);
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `📄 Document text registered as "${response.data.documentName}". Ask your questions and I'll answer using it.`
        }]);
      } else {
        throw new Error(response.data?.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('startSessionWithText error:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '❌ Unable to start a document session with the provided text.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async (question) => {
    if (!sessionId) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '⚠️ Please upload a document first so I can ground my answers.'
      }]);
      return;
    }
    
    setIsLoading(true);
    
    // Add typing indicator immediately
    const typingIndicatorId = Date.now();
    setMessages(prev => [...prev, {
      id: typingIndicatorId,
      sender: 'bot',
      text: '...',
      isTyping: true,
      timestamp: new Date().toISOString()
    }]);
    
    try {
      // Enhanced prompt for risk detection
      let enhancedQuestion = question;
      if (question.includes('Risk Detector')) {
        enhancedQuestion = `${question}

Please analyze this document for potential risks and unfair terms. For each identified issue, categorize it with risk levels:
🟢 Standard (safe) - Normal, fair terms
🟡 Needs attention - Terms that require careful consideration (e.g., auto-renewal clauses, broad termination rights)
🔴 High-risk - Potentially unfair or dangerous terms (e.g., hidden fees, excessive personal liability, one-sided indemnification)

Format your response with clear risk level indicators and explanations for each flagged item.`;
      }
      
      const response = await axios.post(`http://localhost:3001/api/doc-chat/${sessionId}/ask`, {
        question: enhancedQuestion,
        provider: 'openai'
      });
      if (response.data && response.data.success) {
        // Remove typing indicator and add actual response
        setMessages(prev => prev
          .filter(msg => msg.id !== typingIndicatorId)
          .concat([{
            sender: 'bot',
            text: response.data.response,
            timestamp: response.data.timestamp
          }])
        );
      } else {
        throw new Error(response.data?.error || 'Ask failed');
      }
    } catch (error) {
      console.error('askQuestion error:', error);
      
      // Remove typing indicator and add error message
      setMessages(prev => prev
        .filter(msg => msg.id !== typingIndicatorId)
        .concat([{
          sender: 'bot',
          text: '❌ I had trouble answering that against the document.'
        }])
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setShowSuggestions(false);
    const currentInput = input;
    setInput('');
    await askQuestion(currentInput);
  };

  const handleSuggestionClick = useCallback(async (suggestionText) => {
    const userMessage = { sender: 'user', text: suggestionText };
    setMessages(prev => [...prev, userMessage]);
    setShowSuggestions(false);
    
    await askQuestion(suggestionText);
  }, [askQuestion]);

  const handleInputChange = (e) => setInput(e.target.value);
  const handleInputKeyDown = (e) => { if (e.key === 'Enter') handleSend(); };

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');

    // Audio -> transcribe then prefill input
    if (file.type.startsWith('audio/')) {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('languageCode', selectedLanguage);
      setIsLoading(true);
      try {
        const resp = await fetch('http://localhost:3001/api/speech-to-text', {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();
        let transcription = '';
        if (data.transcription) transcription = data.transcription;
        else if (data.results) transcription = data.results.map(r => r.alternatives[0].transcript).join('\n');
        setInput(transcription);
      } catch (error) {
        console.error('speech-to-text error:', error);
        setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I could not transcribe that audio.' }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Document -> create/update session
    const isDocument = file.type === 'application/pdf' ||
                      file.type === 'application/msword' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.type === 'text/plain';

    if (isDocument) {
      await startSessionWithFile(file);
      return;
    }

    // Other files/images -> acknowledge
    setMessages(prev => [...prev, {
      sender: 'user',
      type: isImage ? 'image' : 'file',
      fileUrl: URL.createObjectURL(file),
      text: `📎 ${isImage ? 'Image' : 'File'}: ${file.name}`
    }]);
    setMessages(prev => [...prev, { sender: 'bot', text: 'I received your file. Upload a document to enable document-grounded Q&A.' }]);
  }, [selectedLanguage, startSessionWithFile]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioPermissionGranted(true);
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 48000 });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (event) => { audioChunks.current.push(event.data); };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm;codecs=opus' });
        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');
          formData.append('languageCode', selectedLanguage);
          const response = await fetch('http://localhost:3001/api/speech-to-text', { method: 'POST', body: formData });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          let transcription = '';
          if (data.transcription) transcription = data.transcription;
          else if (data.results) transcription = data.results.map(r => r.alternatives[0].transcript).join('\n');
          if (!transcription) throw new Error('No transcription received from backend');
          setInput(transcription);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I had trouble transcribing your voice message.' }]);
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
  }, [selectedLanguage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    messages,
    input,
    isRecording,
    audioPermissionGranted,
    isLoading,
    selectedLanguage,
    setSelectedLanguage,
    showSuggestions,
    
    // Constants
    LANGUAGES,
    SUGGESTION_MESSAGES: DOC_SUGGESTION_MESSAGES,
    
    // Actions
    handleSend,
    handleInputChange,
    handleInputKeyDown,
    handleSuggestionClick,
    startRecording,
    stopRecording,
    handleFileUpload,
    prefillInput,
    startSessionWithFile,
    startSessionWithText,
    
    // Session info
    sessionId,
    documentName
  };
}


