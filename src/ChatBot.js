import React, { useState, useRef } from 'react';
import './ChatBot.css';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import ChatIcon from '@mui/icons-material/Chat';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ReactMarkdown from 'react-markdown';
import DocumentAnalyzer from './components/DocumentAnalyzer';
import FormFiller from './components/FormFiller';
import DocumentGenerator from './components/DocumentGenerator';

function ChatBot({ 
  messages, 
  input, 
  isRecording,
  isLoading,
  handleSend, 
  handleInputChange, 
  handleInputKeyDown,
  startRecording,
  stopRecording,
  handleFileUpload
}) {
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Document analysis state
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [formAnswers, setFormAnswers] = useState({});
  const [workflowStep, setWorkflowStep] = useState('chat'); // 'chat', 'analyze', 'form', 'generate'

  // Scroll to bottom when messages change
  const messagesEndRef = React.useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  React.useEffect(scrollToBottom, [messages]);

  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsWebcamOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        const file = new File([blob], 'webcam-capture.png', { type: 'image/png' });
        handleFileUpload(file);
        stopWebcam();
      }, 'image/png');
    }
  };

  // Event handlers for document workflow
  const handleAnalysisComplete = (analysis, docType) => {
    setDocumentAnalysis(analysis);
    setDocumentType(docType);
    setWorkflowStep('form');
  };

  const handleQuestionsGenerated = (questions) => {
    setFormQuestions(questions);
  };

  const handleFormComplete = async (answers) => {
    setFormAnswers(answers);
    setWorkflowStep('generate');
  };

  const handleNewDocument = () => {
    setDocumentAnalysis(null);
    setDocumentType(null);
    setFormQuestions([]);
    setFormAnswers({});
    setWorkflowStep('analyze');
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1) {
      setWorkflowStep('analyze');
    } else if (newValue === 0) {
      setWorkflowStep('chat');
    }
  };

  const renderTabContent = () => {
    if (currentTab === 0) {
      return (
        <div className="chatbot-container">
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message chatbot-message-${msg.sender}`}>
                {msg.type === 'audio' ? (
                  <div className="audio-message">
                    <audio controls src={msg.audioUrl} />
                    <span>{msg.text}</span>
                  </div>
                ) : msg.type === 'image' ? (
                  <div className="image-message">
                    <img src={msg.fileUrl} alt="Uploaded" />
                    <span>{msg.text}</span>
                  </div>
            ) : msg.type === 'file' ? (
              <div className="file-message">
                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">{msg.text}</a>
              </div>
            ) : msg.downloadUrl ? (
              <div className="download-message">
                <ReactMarkdown 
                  style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.6',
                    textAlign: msg.sender === 'bot' ? 'left' : 'left'
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                <div style={{ marginTop: '10px' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = msg.downloadUrl;
                      link.download = msg.fileName || 'document.txt';
                      link.click();
                    }}
                    style={{ marginRight: '10px' }}
                  >
                    📥 Download Document
                  </Button>
                </div>
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
          <div className="chatbot-input-row">
            <input 
              type="file" 
              id="file-upload" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileUpload(e.target.files[0])}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Dialog 
              open={isWebcamOpen} 
              onClose={stopWebcam}
              maxWidth="md"
            >
              <DialogContent>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', maxWidth: '640px' }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={stopWebcam} color="primary">
                  Cancel
                </Button>
                <Button onClick={capturePhoto} color="primary" variant="contained">
                  Take Photo
                </Button>
              </DialogActions>
            </Dialog>
            <div className="chatbot-actions">
              <Tooltip title="Attach File">
                <IconButton 
                  color="primary" 
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <AttachFileIcon />
                </IconButton>
              </Tooltip>
            </div>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your message..."
            />
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
    } else if (currentTab === 1) {
      if (workflowStep === 'analyze') {
        return (
          <DocumentAnalyzer 
            onAnalysisComplete={handleAnalysisComplete}
            onQuestionsGenerated={handleQuestionsGenerated}
          />
        );
      } else if (workflowStep === 'form') {
        return (
          <FormFiller 
            questions={formQuestions}
            onFormComplete={handleFormComplete}
            onBack={() => setWorkflowStep('analyze')}
          />
        );
      } else if (workflowStep === 'generate') {
        return (
          <DocumentGenerator 
            analysis={documentAnalysis}
            answers={formAnswers}
            documentType={documentType}
            onNewDocument={handleNewDocument}
          />
        );
      }
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
        <Typography variant="h4" component="h1" align="center" color="primary" gutterBottom>
          AI Legal Assistant for the Rakyat
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary">
          Making legal documents accessible and understandable for everyone
        </Typography>
      </Paper>

      {/* Tabs */}
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange} 
        centered 
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<ChatIcon />} 
          label="Legal Q&A Chat" 
          iconPosition="start"
        />
        <Tab 
          icon={<DescriptionIcon />} 
          label="Document Analysis & Completion" 
          iconPosition="start"
        />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
}

export default ChatBot;
