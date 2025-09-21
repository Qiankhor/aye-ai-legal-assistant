import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Fab from '@mui/material/Fab';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import Tooltip from '@mui/material/Tooltip';
import EmailIcon from '@mui/icons-material/Email';
import { useWorkspaceViewModel } from '../WorkspaceViewModel';
import { useWorkspaceAIViewModel } from '../WorkspaceAIViewModel';
import ChatBot from '../ChatBot';

// AI Agent Sidebar Component
function AIAgentSidebar({ open, onClose, onWidthChange, workspaceContext }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem('workspaceAISidebarWidth');
    return savedWidth ? parseInt(savedWidth) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showWidthIndicator, setShowWidthIndicator] = useState(false);
  const [snapPoints] = useState([300, 400, 500, 600, 700, 800]);
  const defaultWidth = 400;

  // Initialize AI view model with workspace context
  const aiViewModel = useWorkspaceAIViewModel(workspaceContext);

  // Notify parent of width changes when sidebar opens
  React.useEffect(() => {
    if (open && onWidthChange) {
      onWidthChange(sidebarWidth);
    }
  }, [open, sidebarWidth, onWidthChange]);

  // Resize handlers
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    let newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = Math.min(800, window.innerWidth * 0.8);
    
    // Clamp width to bounds
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // Snap to predefined points (within 20px threshold)
    const snapThreshold = 20;
    for (const snapPoint of snapPoints) {
      if (Math.abs(newWidth - snapPoint) < snapThreshold && snapPoint >= minWidth && snapPoint <= maxWidth) {
        newWidth = snapPoint;
        break;
      }
    }
    
    setSidebarWidth(newWidth);
    localStorage.setItem('workspaceAISidebarWidth', newWidth.toString());
    if (onWidthChange) {
      onWidthChange(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setShowWidthIndicator(false);
  };

  // Double-click to reset to default width
  const handleDoubleClick = () => {
    setSidebarWidth(defaultWidth);
    localStorage.setItem('workspaceAISidebarWidth', defaultWidth.toString());
    if (onWidthChange) {
      onWidthChange(defaultWidth);
    }
  };

  // Enhanced mouse down with width indicator
  const handleEnhancedMouseDown = (e) => {
    setIsResizing(true);
    setShowWidthIndicator(true);
    e.preventDefault();
  };

  // Keyboard shortcuts for resizing
  const handleKeyDown = React.useCallback((e) => {
    if (!open) return;
    
    // Ctrl/Cmd + Arrow keys to resize
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const increment = e.shiftKey ? 50 : 20; // Shift for larger increments
      let newWidth = sidebarWidth;
      
      if (e.key === 'ArrowLeft') {
        newWidth = Math.max(300, sidebarWidth - increment);
      } else {
        newWidth = Math.min(Math.min(800, window.innerWidth * 0.8), sidebarWidth + increment);
      }
      
      setSidebarWidth(newWidth);
      localStorage.setItem('workspaceAISidebarWidth', newWidth.toString());
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    }
    
    // Ctrl/Cmd + 0 to reset to default
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      handleDoubleClick();
    }
  }, [open, sidebarWidth, onWidthChange]);

  // Add keyboard event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Add event listeners for resize
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          maxWidth: '90vw',
          minWidth: 300,
          top: { xs: '56px', sm: '64px' },
          height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          position: 'fixed',
          zIndex: (theme) => theme.zIndex.drawer - 1,
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
        {/* Enhanced Resize Handle */}
        <Box
          onMouseDown={handleEnhancedMouseDown}
          onDoubleClick={handleDoubleClick}
          sx={{
            width: isResizing ? 6 : 4,
            cursor: 'ew-resize',
            backgroundColor: isResizing ? 'primary.main' : 'divider',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&:hover': {
              backgroundColor: 'primary.main',
              width: 6,
              '& .resize-tooltip': {
                opacity: 1,
                transform: 'translateX(-50%) translateY(-50%) scale(1)',
              }
            },
          }}
          title="Drag to resize • Double-click to reset • Ctrl+← → to resize • Ctrl+0 to reset"
        >
          <DragIndicatorIcon 
            sx={{ 
              fontSize: isResizing ? 18 : 16, 
              color: isResizing ? 'primary.contrastText' : 'text.secondary',
              transform: 'rotate(90deg)',
              opacity: isResizing ? 1 : 0.6,
              transition: 'all 0.2s ease',
            }} 
          />
          
          {/* Resize Tooltip */}
          <Box
            className="resize-tooltip"
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%) scale(0.8)',
              opacity: 0,
              transition: 'all 0.2s ease',
              backgroundColor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 1,
              py: 0.5,
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {sidebarWidth}px
            </Typography>
          </Box>
        </Box>

        {/* Width Indicator Overlay */}
        {showWidthIndicator && (
          <Box
            sx={{
              position: 'fixed',
              top: '50%',
              right: sidebarWidth + 20,
              transform: 'translateY(-50%)',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              px: 2,
              py: 1,
              borderRadius: 2,
              boxShadow: 4,
              zIndex: 2000,
              fontSize: '0.875rem',
              fontWeight: 600,
              pointerEvents: 'none',
              animation: 'pulse 1s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 0.8 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.8 },
              }
            }}
          >
            {sidebarWidth}px
            <Box
              sx={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid',
                borderLeftColor: 'primary.main',
              }}
            />
          </Box>
        )}

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AutoAwesomeIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>AYE Workspace Helper</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your intelligent workspace assistant
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Upload Document">
                  <IconButton 
                    onClick={() => {
                      if (aiViewModel.triggerFileUpload) {
                        aiViewModel.triggerFileUpload();
                      }
                    }}
                    sx={{ 
                      backgroundColor: 'action.hover',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                      }
                    }}
                  >
                    <CloudUploadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <IconButton onClick={onClose}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* ChatBot Content */}
          <Box sx={{ flex: 1, minHeight: 0, p: 0 }}>
            <ChatBot
              messages={aiViewModel.messages}
              input={aiViewModel.input}
              isRecording={aiViewModel.isRecording}
              isLoading={aiViewModel.isLoading}
              handleSend={aiViewModel.handleSend}
              handleInputChange={aiViewModel.handleInputChange}
              handleInputKeyDown={aiViewModel.handleInputKeyDown}
              startRecording={aiViewModel.startRecording}
              stopRecording={aiViewModel.stopRecording}
              handleFileUpload={aiViewModel.handleFileUpload}
              selectedLanguage={aiViewModel.selectedLanguage}
              setSelectedLanguage={aiViewModel.setSelectedLanguage}
              LANGUAGES={aiViewModel.LANGUAGES}
              showSuggestions={aiViewModel.showSuggestions}
              SUGGESTION_MESSAGES={aiViewModel.SUGGESTION_MESSAGES}
              handleSuggestionClick={aiViewModel.handleSuggestionClick}
            />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

export default function AIWorkspacePage({ onFileOpen }) {
  // Use workspace view model for backend integration
  const workspaceViewModel = useWorkspaceViewModel();
  const {
    todos,
    files,
    isLoadingTodos,
    isLoadingFiles,
    error,
    successMessage,
    createTodo,
    toggleTodo,
    deleteTodo,
    uploadFile,
    deleteFile,
    generateAITasks,
    analyzeFile,
    getFileContent,
    sendEmail,
    clearError,
    clearSuccessMessage
  } = workspaceViewModel;

  // UI state
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [addTodoDialog, setAddTodoDialog] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    body: '',
    documentTitle: ''
  });
  const [isEmailSending, setIsEmailSending] = useState(false);
  const fileInputRef = useRef(null);

  // Handle todo creation
  const handleCreateTodo = async () => {
    if (!newTodoText.trim()) return;

    const result = await createTodo(newTodoText, newTodoDueDate || null);
    if (result.success) {
      setAddTodoDialog(false);
      setNewTodoText('');
      setNewTodoDueDate('');
    }
  };

  // Handle email sending
  const handleSendEmail = async () => {
    if (!emailForm.recipientEmail.trim()) return;
    if (!emailForm.subject.trim() && !emailForm.body.trim()) return;

    setIsEmailSending(true);
    try {
      const result = await sendEmail(
        emailForm.recipientEmail,
        emailForm.subject,
        emailForm.body,
        emailForm.documentTitle || null,
        'Workspace email'
      );
      
      if (result.success) {
        setEmailDialog(false);
        setEmailForm({
          recipientEmail: '',
          subject: '',
          body: '',
          documentTitle: ''
        });
      }
    } catch (error) {
      console.error('Email send error:', error);
    } finally {
      setIsEmailSending(false);
    }
  };

  // Handle email form changes
  const handleEmailFormChange = (field, value) => {
    setEmailForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Open email dialog with pre-filled document info
  const openEmailDialogForFile = (file) => {
    setEmailForm({
      recipientEmail: '',
      subject: `Re: ${file.name}`,
      body: `Please find attached information regarding ${file.name}.\n\nThis document was shared from the AYE Legal Assistant workspace.\n\nBest regards,`,
      documentTitle: file.name
    });
    setEmailDialog(true);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      if (result.success) {
        // File uploaded successfully - show success message
        console.log('File uploaded:', result.file);
        // The success feedback will be shown via the error state management in WorkspaceViewModel
      }
    } catch (error) {
      console.error('File upload error:', error);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop for file upload
  const handleDrop = async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handle file opening
  const handleFileOpen = async (file) => {
    if (!onFileOpen) return;

    try {
      // Get file content from backend
      const result = await getFileContent(file.id);
      if (result.success && result.file.content) {
        // Convert base64 content back to File object
        const base64Data = result.file.content;
        
        // Extract the base64 part (remove data:mime/type;base64, prefix)
        const base64Content = base64Data.includes(',') 
          ? base64Data.split(',')[1] 
          : base64Data;
        
        // Convert base64 to binary
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Determine MIME type
        let mimeType = 'application/octet-stream';
        if (file.type === 'pdf') {
          mimeType = 'application/pdf';
        } else if (file.type === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (file.type === 'doc') {
          mimeType = 'application/msword';
        } else if (file.type === 'txt') {
          mimeType = 'text/plain';
        }
        
        // Create File object
        const fileBlob = new Blob([bytes], { type: mimeType });
        const fileObject = new File([fileBlob], file.name, { type: mimeType });
        
        // Call the onFileOpen callback
        onFileOpen(fileObject);
      } else {
        console.error('Failed to get file content:', result.error);
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };


  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <DescriptionIcon color="error" />;
      case 'docx': return <DescriptionIcon color="primary" />;
      case 'txt': return <DescriptionIcon color="action" />;
      default: return <DescriptionIcon />;
    }
  };

  // Prepare workspace context for AI
  const workspaceContext = {
    todos,
    files,
    createTodo,
    fetchTodos: workspaceViewModel.fetchTodos,
    uploadFile,
    generateAITasks,
    analyzeFile,
    sendEmail,
    openEmailDialog: (prefilledData = {}) => {
      setEmailForm({
        recipientEmail: prefilledData.recipientEmail || '',
        subject: prefilledData.subject || '',
        body: prefilledData.body || '',
        documentTitle: prefilledData.documentTitle || ''
      });
      setEmailDialog(true);
    },
    triggerFileUpload: () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      height: '100%', 
      minHeight: '100vh',
      display: 'flex',
      transition: 'margin-right 0.3s ease',
      marginRight: aiAgentOpen ? `${sidebarWidth}px` : 0
    }}>
      <Box sx={{ 
        flex: 1, 
        p: 3,
        height: '100%', 
        minHeight: '100vh',
        overflow: 'auto'
      }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        My Workspace
      </Typography>

        {/* Loading Backdrop */}
        <Backdrop open={isLoadingTodos || isLoadingFiles} sx={{ zIndex: 1000 }}>
          <CircularProgress color="primary" />
        </Backdrop>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* To-Do List Section */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                To-Do List
                  {isLoadingTodos && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<AddIcon />}
                  onClick={() => setAddTodoDialog(true)}
                  disabled={isLoadingTodos}
                >
                  Add Task
                </Button>
              </Box>
              
              <List>
                {todos.map((todo, index) => (
                  <React.Fragment key={todo.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <IconButton onClick={() => toggleTodo(todo.id)} size="small">
                          {todo.completed ? 
                            <CheckCircleIcon color="success" /> : 
                            <RadioButtonUncheckedIcon />
                          }
                        </IconButton>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            sx={{ 
                              textDecoration: todo.completed ? 'line-through' : 'none',
                              color: todo.completed ? 'text.secondary' : 'text.primary',
                              fontSize: '0.95rem'
                            }}
                          >
                            {todo.task}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Due: {todo.dueDate} • Status: {todo.status || 'pending'}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => deleteTodo(todo.id)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < todos.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              {todos.length === 0 && !isLoadingTodos && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks yet. Add your first task or ask AI to help organize your work!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

        {/* File Storage Section */}
          <Card
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                My Files
                  {isLoadingFiles && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<EmailIcon />}
                  onClick={() => setEmailDialog(true)}
                  disabled={isLoadingFiles}
                >
                  Send Email
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<CloudUploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingFiles}
                >
                  Upload File
                </Button>
              </Box>
            </Box>
              
              <List>
                {files.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        {getFileIcon(file.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            sx={{ 
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              color: 'primary.main',
                              textDecoration: 'underline',
                              '&:hover': {
                                color: 'primary.dark'
                              }
                            }}
                            onClick={() => handleFileOpen(file)}
                            title="Click to open file in document viewer"
                          >
                            {file.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {file.size} • {file.date} • {file.documentType || 'document'}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          size="small" 
                          sx={{ mr: 1 }}
                          onClick={() => analyzeFile(file.id)}
                          title="Analyze with AI"
                        >
                          <AutoAwesomeIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          sx={{ mr: 1 }}
                          onClick={() => openEmailDialogForFile(file)}
                          title="Send via email"
                        >
                          <EmailIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" sx={{ mr: 1 }}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => deleteFile(file.id)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < files.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              {files.length === 0 && !isLoadingFiles && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No files stored yet. Upload your first file or drag & drop here!
                  </Typography>
                </Box>
                )}
            </CardContent>
          </Card>
      </Box>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Floating AI Agent Toggle Button */}
      {!aiAgentOpen && (
        <Fab
          color="primary"
          aria-label="AI Workspace Assistant"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            transition: 'opacity 0.3s ease'
          }}
          onClick={() => setAiAgentOpen(true)}
        >
          <AutoAwesomeIcon />
        </Fab>
      )}

      {/* AI Agent Sidebar */}
      <AIAgentSidebar 
        open={aiAgentOpen} 
        onClose={() => setAiAgentOpen(false)}
        onWidthChange={setSidebarWidth}
        workspaceContext={workspaceContext}
      />

      {/* Add Todo Dialog */}
      <Dialog open={addTodoDialog} onClose={() => setAddTodoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Description"
            fullWidth
            variant="outlined"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Due Date"
            type="date"
            fullWidth
            variant="outlined"
            value={newTodoDueDate}
            onChange={(e) => setNewTodoDueDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTodoDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTodo} variant="contained" disabled={!newTodoText.trim()}>
            Add Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialog} onClose={() => setEmailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EmailIcon sx={{ mr: 1 }} />
            Send Email
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Recipient Email"
            type="email"
            fullWidth
            variant="outlined"
            value={emailForm.recipientEmail}
            onChange={(e) => handleEmailFormChange('recipientEmail', e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Subject"
            fullWidth
            variant="outlined"
            value={emailForm.subject}
            onChange={(e) => handleEmailFormChange('subject', e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Document Title (Optional)"
            fullWidth
            variant="outlined"
            value={emailForm.documentTitle}
            onChange={(e) => handleEmailFormChange('documentTitle', e.target.value)}
            sx={{ mb: 2 }}
            helperText="Reference document name for context"
          />
          <TextField
            margin="dense"
            label="Email Body"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={emailForm.body}
            onChange={(e) => handleEmailFormChange('body', e.target.value)}
            placeholder="Enter your email message here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialog(false)} disabled={isEmailSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail} 
            variant="contained" 
            disabled={!emailForm.recipientEmail.trim() || (!emailForm.subject.trim() && !emailForm.body.trim()) || isEmailSending}
            startIcon={isEmailSending ? <CircularProgress size={16} /> : <EmailIcon />}
          >
            {isEmailSending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={clearError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={4000} 
        onClose={clearSuccessMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={clearSuccessMessage} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
