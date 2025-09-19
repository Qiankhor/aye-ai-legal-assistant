import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Description as DocumentIcon,
  Share as ShareIcon
} from '@mui/icons-material';

const DocumentGenerator = ({ 
  analysis, 
  answers, 
  documentType, 
  onRegenerate, 
  onNewDocument 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState(null);
  const [error, setError] = useState(null);

  const generateDocument = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5001/api/documents/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis,
          answers,
          documentType
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedDocument(data.document);
      } else {
        setError(data.error || 'Failed to generate document');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Document generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!generatedDocument) return;

    const element = document.createElement('a');
    const file = new Blob([generatedDocument], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `completed-${documentType}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async () => {
    if (!generatedDocument) return;

    try {
      await navigator.clipboard.writeText(generatedDocument);
      // You could add a toast notification here
      alert('Document copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // const shareDocument = () => {
  //   if (!generatedDocument) return;

  //   if (navigator.share) {
  //     navigator.share({
  //       title: `Completed ${documentType}`,
  //       text: generatedDocument.substring(0, 200) + '...',
  //     }).catch(err => console.error('Error sharing:', err));
  //   } else {
  //     copyToClipboard();
  //   }
  // };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom color="primary">
          <DocumentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Document Generation
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your document has been analyzed and all required information has been collected. 
          Click the button below to generate your completed legal document.
        </Typography>

        {/* Document Type and Status */}
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Document Type: <Chip label={documentType || 'Unknown'} color="primary" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {generatedDocument ? 'Completed' : 'Ready to Generate'}
                </Typography>
              </Box>
              {generatedDocument && (
                <CheckIcon color="success" sx={{ fontSize: 40 }} />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Generation Controls */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {!generatedDocument ? (
            <Button
              variant="contained"
              size="large"
              onClick={generateDocument}
              disabled={isGenerating}
              startIcon={<DocumentIcon />}
            >
              {isGenerating ? 'Generating Document...' : 'Generate Document'}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={downloadDocument}
                size="large"
              >
                Download Document
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setGeneratedDocument(null);
                  if (onRegenerate) onRegenerate();
                }}
              >
                Regenerate
              </Button>
            </Box>
          )}
        </Box>

        {isGenerating && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              AI is generating your completed document...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Generated Document Preview */}
        {generatedDocument && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Generated Document Preview
                </Typography>
                <Box>
                  <Tooltip title="Copy to Clipboard">
                    <IconButton onClick={copyToClipboard} size="small">
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box 
                sx={{ 
                  maxHeight: 400, 
                  overflow: 'auto', 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}
              >
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}
                >
                  {generatedDocument}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onNewDocument}
          >
            Analyze New Document
          </Button>
          
          {generatedDocument && (
            <Button
              variant="contained"
              color="primary"
              onClick={downloadDocument}
              startIcon={<DownloadIcon />}
            >
              Download Final Document
            </Button>
          )}
        </Box>

        {/* Important Notice */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This AI-generated document is for reference purposes only. 
            Please review it carefully and consult with a qualified legal professional before using it for any legal purposes. 
            The AI assistant provides general guidance and should not be considered as professional legal advice.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default DocumentGenerator;