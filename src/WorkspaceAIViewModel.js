import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Workspace-specific suggestion messages (backend handles todo creation automatically)
const WORKSPACE_SUGGESTION_MESSAGES = [
  "Help me organize my legal tasks for this week",
  "Create a todo for reviewing the contract I just uploaded",
  "Analyze the risks in my recent documents", 
  "Generate a summary of my pending legal work",
  "What should I prioritize in my legal workflow?",
  "Help me create tasks based on my uploaded documents",
  "Review my workspace and suggest improvements",
  "Create a checklist for contract review process",
  "Help me send an email about a document",
  "Draft an email to notify about contract completion"
];

// Common languages with their codes
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ms-MY', name: 'Malay' },
];

export function useWorkspaceAIViewModel(workspaceContext = {}) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I\'m your AI Workspace Assistant. I can help you manage your legal tasks, analyze documents, and organize your workflow. I have access to your todos and files to provide contextual assistance. How can I help you today?'
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

  // Enhanced message processing with workspace context
  const processTextMessage = async (messageText) => {
    setIsLoading(true);
    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      // Add workspace context to the message
      const contextualMessage = buildContextualMessage(messageText, workspaceContext);

      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: contextualMessage,
        conversationHistory: conversationHistory,
        context: {
          type: 'workspace',
          todos: workspaceContext.todos || [],
          files: workspaceContext.files || [],
          userPreferences: {
            language: selectedLanguage,
            workspaceMode: true
          }
        }
      });

      if (response.data.response) {
        const botResponse = response.data.response;
        
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: botResponse,
          timestamp: response.data.timestamp,
          actions: extractActionsFromResponse(botResponse)
        }]);

        // Handle backend-processed workspace actions
        console.log('🔍 Frontend received response.data:', response.data);
        if (response.data.createdTodos && response.data.createdTodos.length > 0) {
          console.log('🔍 Frontend: Found createdTodos, refreshing...', response.data.createdTodos);
          // Refresh todos in workspace context if available
          if (workspaceContext.fetchTodos) {
            await workspaceContext.fetchTodos();
            console.log('🔍 Frontend: fetchTodos called');
          } else {
            console.log('🔍 Frontend: workspaceContext.fetchTodos not available');
          }
        } else {
          console.log('🔍 Frontend: No createdTodos found in response');
        }

        // Add any additional messages from backend processing
        if (response.data.additionalMessages && response.data.additionalMessages.length > 0) {
          response.data.additionalMessages.forEach(msg => {
            setMessages(prev => [...prev, {
              sender: 'bot',
              text: msg,
              timestamp: new Date().toISOString()
            }]);
          });
        }

        // Handle email suggestions (keep this as it opens UI dialogs)
        await handleEmailActions(botResponse, messageText);
      }
    } catch (error) {
      console.error('Workspace AI error:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'I apologize, but I\'m having trouble accessing your workspace data right now. Please try again in a moment, or check if your backend services are running.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Build contextual message with workspace information
  const buildContextualMessage = (message, context) => {
    const { todos = [], files = [] } = context;
    
    let contextInfo = `\n\n[WORKSPACE CONTEXT]\n`;
    contextInfo += `Available Actions: Create todos, upload files, analyze documents, send emails\n`;
    
    if (todos.length > 0) {
      contextInfo += `\nCurrent Todos (${todos.length}):\n`;
      todos.slice(0, 5).forEach((todo, index) => {
        contextInfo += `${index + 1}. ${todo.task} (${todo.completed ? 'Completed' : 'Pending'})\n`;
      });
      if (todos.length > 5) {
        contextInfo += `... and ${todos.length - 5} more todos\n`;
      }
    }
    
    if (files.length > 0) {
      contextInfo += `\nRecent Files (${files.length}):\n`;
      files.slice(0, 3).forEach((file, index) => {
        contextInfo += `${index + 1}. ${file.name} (${file.type.toUpperCase()}, ${file.date})\n`;
      });
      if (files.length > 3) {
        contextInfo += `... and ${files.length - 3} more files\n`;
      }
    }
    
    contextInfo += `[END CONTEXT]\n\n`;
    
    return message + contextInfo;
  };

  // Extract actionable items from bot response (simplified - backend handles most logic)
  const extractActionsFromResponse = (response) => {
    const actions = [];
    
    // Only keep UI-related actions that need frontend handling
    if (response.toLowerCase().includes('send email') || 
        response.toLowerCase().includes('email') || 
        response.toLowerCase().includes('notify') ||
        response.toLowerCase().includes('send to')) {
      actions.push({
        type: 'send_email',
        label: 'Send Email',
        icon: 'email'
      });
    }
    
    if (response.toLowerCase().includes('analyze') && 
        response.toLowerCase().includes('document')) {
      actions.push({
        type: 'analyze_file',
        label: 'Analyze Document',
        icon: 'analytics'
      });
    }
    
    return actions;
  };

  // Handle email suggestions - open email dialog if bot suggests sending email
  const handleEmailActions = async (botResponse, userMessage) => {
    if ((botResponse.toLowerCase().includes('send email') || 
         botResponse.toLowerCase().includes('email to') ||
         botResponse.toLowerCase().includes('notify via email')) && 
        workspaceContext.openEmailDialog) {
      
      // Try to extract email details from the response
      const emailMatch = botResponse.match(/email.*?to\s+([^\s,]+@[^\s,]+)/i);
      const subjectMatch = botResponse.match(/subject.*?["']([^"']+)["']/i);
      const bodyMatch = botResponse.match(/message.*?["']([^"']+)["']/i);
      
      const prefilledData = {
        recipientEmail: emailMatch ? emailMatch[1] : '',
        subject: subjectMatch ? subjectMatch[1] : '',
        body: bodyMatch ? bodyMatch[1] : ''
      };
      
      // If we have any prefilled data or the user explicitly asked for email
      if (prefilledData.recipientEmail || userMessage.toLowerCase().includes('email')) {
        workspaceContext.openEmailDialog(prefilledData);
      }
    }
  };

  // Prefill input with selected text or suggestions
  const prefillInput = useCallback((text) => {
    setInput(text);
    setShowSuggestions(false);
  }, []);

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
    setShowSuggestions(false);
    
    await processTextMessage(suggestionText);
  };

  const handleInputChange = (e) => setInput(e.target.value);
  const handleInputKeyDown = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recording functionality
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

          const response = await fetch(`${API_BASE_URL}/speech-to-text`, {
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

          setInput(transcription);

        } catch (error) {
          console.error('Error transcribing audio:', error);
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: 'Sorry, I had trouble transcribing your voice message. Please try again or type your message.'
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
  }, [selectedLanguage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  // File upload handler for workspace context
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    // Add file upload message
    setMessages(prev => [...prev, {
      sender: 'user',
      text: `📎 Uploaded file: ${file.name}`,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    }]);

    // Upload file to workspace
    if (workspaceContext.uploadFile) {
      try {
        const result = await workspaceContext.uploadFile(file);
        if (result.success) {
          setMessages(prev => [...prev, {
            sender: 'bot',
            text: `✅ File "${file.name}" has been uploaded to your workspace successfully! I can now help you analyze it or create related tasks. What would you like to do with this document?`,
            actions: [
              { type: 'analyze_file', label: 'Analyze Document', fileId: result.file.id },
              { type: 'create_todo', label: 'Create Related Task', fileName: file.name }
            ]
          }]);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: `❌ Sorry, I couldn't upload the file "${file.name}". Error: ${error.message}`
        }]);
      }
    }
  }, [workspaceContext]);

  // Trigger file upload from UI button
  const triggerFileUpload = useCallback(() => {
    if (workspaceContext.triggerFileUpload) {
      workspaceContext.triggerFileUpload();
      // Add a message to indicate the action
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `📁 Please select a document to upload to your workspace. I'll help you analyze it once it's uploaded!`
      }]);
    }
  }, [workspaceContext]);

  return {
    // State
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
    SUGGESTION_MESSAGES: WORKSPACE_SUGGESTION_MESSAGES,
    
    // Actions
    handleSend,
    handleInputChange,
    handleInputKeyDown,
    handleSuggestionClick,
    startRecording,
    stopRecording,
    handleFileUpload,
    triggerFileUpload,
    prefillInput,
    
    // Utility
    clearMessages: () => setMessages([{
      sender: 'bot',
      text: 'Hello! I\'m your AI Workspace Assistant. How can I help you manage your legal work today?'
    }])
  };
}
