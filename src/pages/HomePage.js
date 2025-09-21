import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import TextField from '@mui/material/TextField';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Backdrop from '@mui/material/Backdrop';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import ChatBot from '../ChatBot';
import { useDocChatViewModel } from '../DocChatViewModel';
import { useWorkspaceViewModel } from '../WorkspaceViewModel';
import { useWorkspaceAIViewModel } from '../WorkspaceAIViewModel';


function AIAgentSidebar({ open, onClose, selectedText, onTextProcessed, onWidthChange, viewModel, mode = 'document', workspaceContext = null }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem('aiAgentSidebarWidth');
    return savedWidth ? parseInt(savedWidth) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Initialize workspace AI view model if in workspace mode
  const workspaceAIViewModel = useWorkspaceAIViewModel(workspaceContext);
  
  // Use appropriate view model based on mode
  const activeViewModel = mode === 'workspace' ? workspaceAIViewModel : viewModel;

  // Notify parent of width changes when sidebar opens
  useEffect(() => {
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
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = Math.min(800, window.innerWidth * 0.8);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
      localStorage.setItem('aiAgentSidebarWidth', newWidth.toString());
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add event listeners for resize
  useEffect(() => {
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

  //

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
            top: { xs: '56px', sm: '64px' }, // Responsive AppBar height (56px on mobile, 64px on desktop)
            height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' }, // Full height minus AppBar
            position: 'fixed',
            zIndex: (theme) => theme.zIndex.drawer - 1, // Below AppBar but above content
            boxShadow: (theme) => theme.shadows[8], // Add shadow for better visual separation
          },
        }}
      >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
        {/* Resize Handle */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: 4,
            cursor: 'ew-resize',
            backgroundColor: isResizing ? 'primary.main' : 'divider',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: 'primary.main',
            },
          }}
        >
          <DragIndicatorIcon 
            sx={{ 
              fontSize: 16, 
              color: 'text.secondary',
              transform: 'rotate(90deg)',
              opacity: isResizing ? 1 : 0.5,
            }} 
          />
        </Box>

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
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {mode === 'workspace' ? 'AYE Workspace Helper' : 'AYE Legal Document Helper'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mode === 'workspace' ? 'Your intelligent workspace assistant' : 'Your Legal Assistant'}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* ChatBot Content */}
        <Box sx={{ flex: 1, minHeight: 0, p: 0 }}>
          <ChatBot
            messages={activeViewModel.messages}
            input={activeViewModel.input}
            isRecording={activeViewModel.isRecording}
            isLoading={activeViewModel.isLoading}
            handleSend={activeViewModel.handleSend}
            handleInputChange={activeViewModel.handleInputChange}
            handleInputKeyDown={activeViewModel.handleInputKeyDown}
            startRecording={activeViewModel.startRecording}
            stopRecording={activeViewModel.stopRecording}
            handleFileUpload={activeViewModel.handleFileUpload}
            selectedLanguage={activeViewModel.selectedLanguage}
            setSelectedLanguage={activeViewModel.setSelectedLanguage}
            LANGUAGES={activeViewModel.LANGUAGES}
            showSuggestions={activeViewModel.showSuggestions}
            SUGGESTION_MESSAGES={activeViewModel.SUGGESTION_MESSAGES}
            handleSuggestionClick={activeViewModel.handleSuggestionClick}
          />
        </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

function DocViewer({ docFile, onClose, onTextSelect }) {
  const [docContent, setDocContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    if (docFile && window.mammoth) {
      loadDocument();
    } else if (docFile) {
      // Load mammoth.js if not already loaded
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => loadDocument();
      script.onerror = () => setError('Failed to load document parser');
      document.head.appendChild(script);
    }
  }, [docFile]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check file size (limit to 50MB)
      if (docFile.size > 50 * 1024 * 1024) {
        throw new Error('File is too large. Please use files smaller than 50MB.');
      }

      // Check if it's a DOC file (older format)
      const isOldDocFormat = docFile.name.toLowerCase().endsWith('.doc') || 
                            docFile.type === 'application/msword';

      if (isOldDocFormat) {
        throw new Error('Legacy DOC files are not fully supported. Please convert to DOCX format or use a PDF version.');
      }

      const arrayBuffer = await docFile.arrayBuffer();
      
      // Validate that it's actually a DOCX file by checking the file signature
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4));
      const signature = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // DOCX files start with PK (ZIP signature: 50 4B)
      if (!signature.startsWith('504b')) {
        throw new Error('File appears to be corrupted or is not a valid DOCX document.');
      }

      const result = await window.mammoth.convertToHtml({ 
        arrayBuffer,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh"
        ]
      });
      
      if (!result.value || result.value.trim() === '') {
        throw new Error('Document appears to be empty or contains no readable text.');
      }
      
      setDocContent(result.value);
      
      // Show warnings if any
      if (result.messages.length > 0) {
        const warnings = result.messages.filter(m => m.type === 'warning');
        if (warnings.length > 0) {
          console.warn('Document conversion warnings:', warnings);
        }
      }
    } catch (err) {
      console.error('Error loading document:', err);
      
      // Provide specific error messages
      let errorMessage = 'Failed to load document. ';
      
      if (err.message.includes('too large')) {
        errorMessage = err.message;
      } else if (err.message.includes('Legacy DOC')) {
        errorMessage = err.message;
      } else if (err.message.includes('corrupted')) {
        errorMessage = err.message + ' Try re-saving the document as DOCX.';
      } else if (err.message.includes('empty')) {
        errorMessage = err.message;
      } else if (err.name === 'TypeError' || err.message.includes('arrayBuffer')) {
        errorMessage = 'Unable to read the file. The document may be corrupted or password-protected.';
      } else {
        errorMessage = 'Unable to process this document. Please ensure it\'s a valid DOCX file or try converting it to PDF.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      if (onTextSelect) {
        onTextSelect(text);
      }
    }
  };

  useEffect(() => {
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('mouseup', handleTextSelection);
      contentElement.addEventListener('touchend', handleTextSelection);
      
      return () => {
        contentElement.removeEventListener('mouseup', handleTextSelection);
        contentElement.removeEventListener('touchend', handleTextSelection);
      };
    }
  }, [docContent]);

  const getFileIcon = () => {
    const extension = docFile.name.split('.').pop().toLowerCase();
    return <DescriptionIcon color="primary" />;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Document Controls */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getFileIcon()}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {docFile?.name}
          </Typography>
        </Box>
        
        <Box sx={{ flex: 1 }} />
        
        {selectedText && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              if (onTextSelect) {
                onTextSelect(selectedText);
              }
            }}
            sx={{ ml: 1 }}
          >
            Ask AI about selection
          </Button>
        )}

        <IconButton onClick={onClose} color="error">
          <DeleteIcon />
        </IconButton>
      </Paper>

      {/* Document Content */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: '#f5f5f5',
          p: 2
        }}
      >
        {isLoading ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h6">Loading document...</Typography>
            <Typography variant="body2" color="text.secondary">
              Converting Word document to readable format
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '400px',
            flexDirection: 'column',
            gap: 2,
            p: 4
          }}>
            <DescriptionIcon sx={{ fontSize: 60, color: 'error.main' }} />
            <Typography variant="h6" color="error" sx={{ textAlign: 'center' }}>
              Document Loading Error
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '500px' }}>
              {error}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={loadDocument}
                startIcon={<AutoAwesomeIcon />}
              >
                Try Again
              </Button>
              <Button 
                variant="contained" 
                onClick={onClose}
                color="primary"
              >
                Choose Different File
              </Button>
            </Box>
            
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1, maxWidth: '500px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Troubleshooting Tips:
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                • Use DOCX format instead of older DOC files<br/>
                • Ensure the file is not password-protected<br/>
                • Try converting the document to PDF<br/>
                • Check that the file is not corrupted<br/>
                • File size should be under 50MB
              </Typography>
            </Box>
          </Box>
        ) : (
          <Paper 
            elevation={1} 
            sx={{ 
              p: 4, 
              backgroundColor: 'white',
              minHeight: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            {/* Selection Highlight Overlay */}
            {selectedText && (
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  mb: 2,
                  zIndex: 10
                }}
              >
                Selected: {selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}
              </Box>
            )}
            
            <div
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: docContent }}
              style={{
                userSelect: 'text',
                cursor: 'text',
                lineHeight: '1.6',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif'
              }}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function PDFViewer({ pdfFile, onClose, onTextSelect }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [selectionDialog, setSelectionDialog] = useState({ show: false, x: 0, y: 0, text: '' });

  useEffect(() => {
    if (pdfFile && window.pdfjsLib) {
      const loadPDF = async () => {
        try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          renderPage(pdf, 1);
        } catch (error) {
          console.error('Error loading PDF:', error);
        }
      };
      loadPDF();
    }
  }, [pdfFile]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, zoom, pdfDoc, debugMode]);

  const renderPage = async (pdf, pageNumber) => {
    try {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      const textLayer = textLayerRef.current;
      if (!canvas || !textLayer) return;

      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: zoom });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear text layer
      textLayer.innerHTML = '';
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      // Render PDF page
      await page.render(renderContext).promise;

      // Render text layer for selection
      try {
        const textContent = await page.getTextContent();
        
        // Manual text layer creation (more reliable)
        textContent.items.forEach((textItem, index) => {
          const textDiv = document.createElement('span');
          
          // Calculate position and size
          const transform = textItem.transform;
          const x = transform[4];
          const y = transform[5];
          const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
          
          // Style the text element
          textDiv.style.position = 'absolute';
          textDiv.style.left = x + 'px';
          textDiv.style.top = (viewport.height - y - fontSize) + 'px'; // Flip Y coordinate
          textDiv.style.fontSize = fontSize + 'px';
          textDiv.style.fontFamily = textItem.fontName || 'sans-serif';
          textDiv.style.color = 'transparent';
          textDiv.style.userSelect = 'text';
          textDiv.style.pointerEvents = 'auto';
          textDiv.style.cursor = 'text';
          textDiv.style.whiteSpace = 'pre';
          textDiv.style.transformOrigin = '0% 0%';
          
          // Set the text content
          textDiv.textContent = textItem.str;
          textDiv.setAttribute('data-text-index', index);
          
          textLayer.appendChild(textDiv);
        });
        
        // Add visual debugging
        if (debugMode) {
          textLayer.classList.add('debug');
          textLayer.style.border = '2px solid red';
        } else {
          textLayer.classList.remove('debug');
          textLayer.style.border = 'none';
        }
        textLayer.title = 'Text selection layer - click and drag to select text';
        
      } catch (textError) {
        console.error('Failed to render text layer:', textError);
      }
      
      // Add text selection handlers
      textLayer.addEventListener('mouseup', handleTextSelection);
      textLayer.addEventListener('touchend', handleTextSelection);
      
      // Clear selection when clicking outside
      textLayer.addEventListener('mousedown', (e) => {
        // Small delay to allow for text selection to start
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection.toString().trim()) {
            setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
            setSelectedText('');
          }
        }, 100);
      });
      
      // Also add global selection change listener
      document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          
          // Check if selection is within our text layer
          if (textLayer.contains(container) || textLayer.contains(container.parentElement)) {
            handleTextSelection({ type: 'selectionchange' });
          }
        } else {
          // No selection, clear dialog
          setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
          setSelectedText('');
        }
      });
      
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const handleTextSelection = (event) => {
    setTimeout(() => {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim() && selection.rangeCount > 0) {
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position for the floating dialog
        const dialogX = rect.left + (rect.width / 2);
        const dialogY = rect.top - 10; // Position above the selection
        
        setSelectedText(text);
        setSelectionDialog({
          show: true,
          x: dialogX,
          y: dialogY,
          text: text
        });
      } else {
        // Clear selection
        setSelectedText('');
        setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
      }
    }, 150);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Clear selection when changing pages
      setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
      setSelectedText('');
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Clear selection when changing pages
      setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
      setSelectedText('');
    }
  };

  const handleZoomIn = () => {
    setZoom(zoom + 0.2);
  };

  const handleZoomOut = () => {
    if (zoom > 0.4) {
      setZoom(zoom - 0.2);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* PDF Controls */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PictureAsPdfIcon color="error" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {pdfFile?.name}
          </Typography>
        </Box>
        
        <Box sx={{ flex: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleZoomOut} disabled={zoom <= 0.4}>
            <ZoomOutIcon />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton onClick={handleZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevPage} disabled={currentPage <= 1}>
            <NavigateBeforeIcon />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </Typography>
          <IconButton onClick={handleNextPage} disabled={currentPage >= totalPages}>
            <NavigateNextIcon />
          </IconButton>
        </Box>

        {selectedText && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => {
              if (onTextSelect) {
                onTextSelect(selectedText);
              }
            }}
            sx={{ ml: 1 }}
          >
            Ask AI about selection
          </Button>
        )}

        <Button
          variant={debugMode ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => setDebugMode(!debugMode)}
          sx={{ ml: 1 }}
        >
          {debugMode ? 'Hide Debug' : 'Debug Text'}
        </Button>

        <IconButton onClick={onClose} color="error">
          <DeleteIcon />
        </IconButton>
      </Paper>

      {/* PDF Canvas */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          display: 'flex', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          p: 2
        }}
      >
        <Box 
          sx={{ 
            position: 'relative',
            display: 'inline-block'
          }}
        >
          <canvas 
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              backgroundColor: 'white',
              display: 'block'
            }}
          />
          {/* Text Layer for Selection */}
          <div
            ref={textLayerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'auto',
              userSelect: 'text',
              fontSize: '1px', // Will be scaled by PDF.js
              lineHeight: '1',
              overflow: 'hidden',
              zIndex: 2,
              cursor: 'text'
            }}
            className="textLayer"
          />
          
          {/* Floating Ask AI Dialog */}
          {selectionDialog.show && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => {
                // Hide button immediately
                setSelectionDialog({ show: false, x: 0, y: 0, text: '' });
                // Clear text selection
                setSelectedText('');
                // Clear browser selection
                window.getSelection().removeAllRanges();
                // Send text to AI agent
                if (onTextSelect) {
                  onTextSelect(selectionDialog.text);
                }
              }}
              sx={{
                position: 'fixed',
                left: selectionDialog.x - 40, // Center the button
                top: selectionDialog.y - 40, // Position above selection
                zIndex: 1000,
                boxShadow: (theme) => theme.shadows[8],
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                minWidth: 'auto'
              }}
            >
              Ask AI
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Workspace View Component
function WorkspaceView({ workspaceViewModel, onFileUpload, onFileOpen }) {
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
    clearError,
    clearSuccessMessage
  } = workspaceViewModel;

  // UI state
  const [addTodoDialog, setAddTodoDialog] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      if (result.success && onFileUpload) {
        onFileUpload(result.file);
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
      const result = await uploadFile(files[0]);
      if (result.success && onFileUpload) {
        onFileUpload(result.file);
      }
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

  return (
    <Box sx={{ 
      height: '100%', 
      minHeight: '100vh',
      p: 3,
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

export default function HomePage({ chatViewModel }) {
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'pdf' or 'doc'
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [viewMode, setViewMode] = useState('documents'); // 'documents' or 'workspace'
  const fileInputRef = useRef(null);
  
  // Use document-grounded chatbot view model for document mode
  const internalViewModel = useDocChatViewModel();
  const docViewModel = chatViewModel ?? internalViewModel;
  
  // Use workspace view model for workspace mode
  const workspaceViewModel = useWorkspaceViewModel();

  // Load PDF.js library and CSS
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    };
    document.head.appendChild(script);

    // Add CSS for text layer
    const style = document.createElement('style');
    style.textContent = `
      .textLayer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 1;
        line-height: 1.0;
        z-index: 10;
        pointer-events: auto;
      }
      
      .textLayer > span {
        color: transparent !important;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
        user-select: text !important;
        pointer-events: auto !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
      
      .textLayer ::selection {
        background: rgba(0, 123, 255, 0.5) !important;
        color: transparent !important;
      }
      
      .textLayer ::-moz-selection {
        background: rgba(0, 123, 255, 0.5) !important;
        color: transparent !important;
      }
      
      .textLayer span::selection {
        background: rgba(0, 123, 255, 0.5) !important;
        color: transparent !important;
      }
      
      .textLayer span::-moz-selection {
        background: rgba(0, 123, 255, 0.5) !important;
        color: transparent !important;
      }
      
      /* Debug mode - make text slightly visible */
      .textLayer.debug > span {
        color: rgba(255, 0, 0, 0.1) !important;
        background: rgba(0, 255, 0, 0.05);
        border: 1px solid rgba(255, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const isValidFileType = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const validExtensions = ['.pdf', '.docx'];
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return false;
    }
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const getFileType = (file) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')) {
      return 'doc';
    }
    return null;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(isValidFileType);
    
    if (validFiles.length > 0) {
      const file = validFiles[0];
      setUploadedFile(file);
      setFileType(getFileType(file));
      
      // Start document session
      if (docViewModel && docViewModel.startSessionWithFile) {
        docViewModel.startSessionWithFile(file);
      }
      
      // Also save to workspace
      try {
        const result = await workspaceViewModel.uploadFile(file);
        if (result.success) {
          console.log('File saved to workspace successfully');
          // The success message will be shown via the workspace view model's success state
        }
      } catch (error) {
        console.error('Failed to save file to workspace:', error);
        // Don't show error to user as the main functionality (document viewing) still works
      }
    } else {
      // Check if it's a DOC file specifically
      const hasDocFile = files.some(file => 
        file.name.toLowerCase().endsWith('.doc') || 
        file.type === 'application/msword'
      );
      
      if (hasDocFile) {
        alert('Legacy DOC files are not supported. Please convert to DOCX format or use PDF instead.');
      } else if (files.some(file => file.size > 50 * 1024 * 1024)) {
        alert('File is too large. Please use files smaller than 50MB.');
      } else {
        alert('Please drop a PDF or DOCX document (.pdf, .docx).');
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file && isValidFileType(file)) {
      setUploadedFile(file);
      setFileType(getFileType(file));
      
      // Start document session
      if (docViewModel && docViewModel.startSessionWithFile) {
        docViewModel.startSessionWithFile(file);
      }
      
      // Also save to workspace
      try {
        const result = await workspaceViewModel.uploadFile(file);
        if (result.success) {
          console.log('File saved to workspace successfully');
          // The success message will be shown via the workspace view model's success state
        }
      } catch (error) {
        console.error('Failed to save file to workspace:', error);
        // Don't show error to user as the main functionality (document viewing) still works
      }
    } else if (file) {
      // Provide specific error messages
      if (file.name.toLowerCase().endsWith('.doc') || file.type === 'application/msword') {
        alert('Legacy DOC files are not supported. Please convert to DOCX format or use PDF instead.');
      } else if (file.size > 50 * 1024 * 1024) {
        alert('File is too large. Please use files smaller than 50MB.');
      } else {
        alert('Please select a PDF or DOCX document (.pdf, .docx).');
      }
    }
  };

  const handleCloseDocument = () => {
    setUploadedFile(null);
    setFileType(null);
    setSelectedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextSelect = (text) => {
    setSelectedText(text);
    setAiAgentOpen(true);
    if (text && docViewModel && docViewModel.prefillInput) {
      docViewModel.prefillInput(`"${text}"`);
    }
  };

  // Handle mode change
  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      // Close any open documents when switching to workspace
      if (newMode === 'workspace') {
        setUploadedFile(null);
        setFileType(null);
        setSelectedText('');
      }
      // Close AI agent to reset context
      setAiAgentOpen(false);
    }
  };

  // Handle file opening from workspace
  const handleFileOpenFromWorkspace = (fileObject) => {
    // Switch to document mode
    setViewMode('documents');
    // Set the file to be displayed
    setUploadedFile(fileObject);
    setFileType(getFileType(fileObject));
    // Start session with the file if docViewModel supports it
    if (docViewModel && docViewModel.startSessionWithFile) {
      docViewModel.startSessionWithFile(fileObject);
    }
  };

  // Prepare workspace context for AI
  const workspaceContext = {
    todos: workspaceViewModel.todos,
    files: workspaceViewModel.files,
    createTodo: workspaceViewModel.createTodo,
    uploadFile: workspaceViewModel.uploadFile,
    generateAITasks: workspaceViewModel.generateAITasks,
    analyzeFile: workspaceViewModel.analyzeFile,
    triggerFileUpload: () => {
      // This will be handled by the WorkspaceView component
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      height: '100%', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      transition: 'margin-right 0.3s ease',
      marginRight: aiAgentOpen ? `${sidebarWidth}px` : 0
    }}>
      {/* Mode Toggle Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        zIndex: 10
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleModeChange}
            aria-label="view mode"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                border: 1,
                borderColor: 'divider',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  }
                }
              }
            }}
          >
            <ToggleButton value="documents" aria-label="documents">
              <DescriptionIcon sx={{ mr: 1 }} />
              Documents
            </ToggleButton>
            <ToggleButton value="workspace" aria-label="workspace">
              <WorkIcon sx={{ mr: 1 }} />
              Workspace
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1, 
        height: '100%', 
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {viewMode === 'workspace' ? (
          /* Workspace View */
          <WorkspaceView 
            workspaceViewModel={workspaceViewModel}
            onFileUpload={(file) => {
              // Optional: Switch to document view when file is uploaded from workspace
              // setViewMode('documents');
              // setUploadedFile(file);
              // setFileType(getFileType(file));
            }}
            onFileOpen={handleFileOpenFromWorkspace}
          />
        ) : uploadedFile ? (
          /* Document Viewer */
          fileType === 'pdf' ? (
            <PDFViewer 
              pdfFile={uploadedFile} 
              onClose={handleCloseDocument} 
              onTextSelect={handleTextSelect}
            />
          ) : (
            <DocViewer 
              docFile={uploadedFile} 
              onClose={handleCloseDocument} 
              onTextSelect={handleTextSelect}
            />
          )
        ) : (
        /* Drag and Drop Area */
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            height: '100%',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 3,
            border: isDragOver ? '3px dashed' : '3px dashed #e0e0e0',
            borderColor: isDragOver ? 'primary.main' : '#e0e0e0',
            borderRadius: 2,
            backgroundColor: isDragOver ? 'primary.50' : 'transparent',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'primary.50',
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUploadIcon 
            sx={{ 
              fontSize: 80, 
              color: isDragOver ? 'primary.main' : 'text.secondary',
              transition: 'color 0.3s ease'
            }} 
          />
          
          <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 300, textAlign: 'center' }}>
            {isDragOver ? 'Drop your document here' : 'Drag & Drop Documents'}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
            {isDragOver 
              ? 'Release to upload your document' 
              : 'Drop PDF or DOCX documents here to view and analyze them with AI'
            }
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            Supports: PDF, DOCX files (up to 50MB)
          </Typography>

          <Typography variant="body2" color="primary.main" sx={{ textAlign: 'center', mt: 1, fontWeight: 500 }}>
            📁 Files will be automatically saved to your workspace
          </Typography>

          <Button 
            variant="outlined" 
            startIcon={<DescriptionIcon />}
            sx={{ mt: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Or Browse Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </Box>
        )}
      </Box>

      {/* Floating AI Agent Toggle Button */}
      {!aiAgentOpen && (
        <Fab
          color="primary"
          aria-label="AI Agent"
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
        selectedText={selectedText}
        onTextProcessed={() => setSelectedText('')}
        onWidthChange={setSidebarWidth}
        viewModel={docViewModel}
        mode={viewMode}
        workspaceContext={viewMode === 'workspace' ? workspaceContext : null}
      />

      {/* Workspace Success/Error Snackbars - Show in all modes */}
      <Snackbar 
        open={!!workspaceViewModel.error} 
        autoHideDuration={6000} 
        onClose={workspaceViewModel.clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={workspaceViewModel.clearError} severity="error" sx={{ width: '100%' }}>
          {workspaceViewModel.error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!workspaceViewModel.successMessage} 
        autoHideDuration={4000} 
        onClose={workspaceViewModel.clearSuccessMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={workspaceViewModel.clearSuccessMessage} severity="success" sx={{ width: '100%' }}>
          {workspaceViewModel.successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

