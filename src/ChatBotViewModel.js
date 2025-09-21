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

const SUGGESTION_MESSAGES = [
  "I need a rental agreement template",
  "Can you help me create an employment contract?",
  "I want to draft a non-disclosure agreement",
  "Please generate a power of attorney form",
  "I need a business partnership agreement",
  "Can you create a service agreement template?",
  "I want to draft a loan agreement",
  "Please help me with a copyright assignment form"
];

export function useChatBotViewModel() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
        text: 'Hello! I\'m AYE AI Legal Assistant. This is your place to request legal document templates and get answers to legal questions. You can also use voice messages for convenience. What legal document or assistance do you need today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showSuggestions, setShowSuggestions] = useState(true);

  

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // Process text message through chat API
  const processTextMessage = async (messageText) => {
    setIsLoading(true);
    try {
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
    setShowSuggestions(false);
    
    await processTextMessage(currentInput);
  };

  const handleSuggestionClick = async (suggestionText) => {
    const userMessage = { sender: 'user', text: suggestionText };
    setMessages(prev => [...prev, userMessage]);
    setShowSuggestions(false); // Hide suggestions after clicking
    
    await processTextMessage(suggestionText);
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


  return {
    messages,
    input,
    isRecording,
    audioPermissionGranted,
    isLoading,
    selectedLanguage,
    setSelectedLanguage,
    showSuggestions,
    LANGUAGES,
    SUGGESTION_MESSAGES,
    handleSend,
    handleInputChange,
    handleInputKeyDown,
    handleSuggestionClick,
    startRecording,
    stopRecording
  };
}