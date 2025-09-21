import React from 'react';
import './ChatBot.css';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ReactMarkdown from 'react-markdown';

function ChatBot({ 
  messages, 
  input, 
  isRecording,
  isLoading,
  showSuggestions,
  SUGGESTION_MESSAGES,
  handleSend, 
  handleInputChange, 
  handleInputKeyDown,
  handleSuggestionClick,
  startRecording,
  stopRecording,
  selectedLanguage,
  setSelectedLanguage,
  LANGUAGES
}) {

  // Scroll to bottom when messages change
  const messagesEndRef = React.useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  React.useEffect(scrollToBottom, [messages]);



  const renderChatContent = () => {
    return (
      <div className="chatbot-container">
        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chatbot-message chatbot-message-${msg.sender} ${msg.isTyping ? 'typing-indicator' : ''}`}>
              {msg.type === 'audio' ? (
                <div className="audio-message">
                  <audio controls src={msg.audioUrl} />
                  <span>{msg.text}</span>
                </div>
              ) : msg.isTyping ? (
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <ReactMarkdown 
                  style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.6',
                    textAlign: msg.sender === 'bot' ? 'left' : 'left'
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Suggestion Messages */}
        {showSuggestions && SUGGESTION_MESSAGES && (
          <div className="chatbot-suggestions">
            <div className="suggestions-header">
              Quick Questions to Ask:
            </div>
            <div className="suggestions-grid">
              {SUGGESTION_MESSAGES.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="chatbot-input-row">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message..."
          />
          {/* Language Selection - Only show if LANGUAGES prop is provided */}
          {LANGUAGES && selectedLanguage && setSelectedLanguage && (
            <Select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              size="small"
              style={{ marginLeft: '8px', marginRight: '8px', minWidth: '120px' }}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          )}
          <IconButton
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop Recording" : "Start Recording"}
            color={isRecording ? "error" : "primary"}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </IconButton>
          <IconButton 
            color="primary" 
            onClick={handleSend}
            title="Send Message"
            disabled={isLoading || !input.trim()}
          >
            <SendIcon />
          </IconButton>
        </div>
      </div>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {renderChatContent()}
    </Box>
  );
}

export default ChatBot;