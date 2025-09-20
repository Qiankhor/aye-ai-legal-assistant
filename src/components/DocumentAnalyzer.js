import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DocumentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';

const DocumentAnalyzer = ({ onAnalysisComplete, onQuestionsGenerated }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('http://localhost:3001/api/documents/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data);
        onAnalysisComplete(data, data.documentName);
        
        // Set questions from the analysis
        setQuestions(data.questions || []);
        onQuestionsGenerated(data.questions || []);
      } else {
        setError(data.error || 'Failed to analyze document');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateQuestions = async (analysis, documentType) => {
    try {
      const response = await fetch('http://localhost:3001/api/documents/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis, documentType }),
      });

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
        onQuestionsGenerated(data.questions);
      }
    } catch (err) {
      console.error('Question generation error:', err);
    }
  };

  const parsedAnalysis = analysis ? {
    documentName: analysis.documentName,
    formFields: analysis.formFields || [],
    questions: analysis.questions || [],
    analysis: analysis.analysis || {}
  } : null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom color="primary">
          <DocumentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Document Analysis
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload a legal document (PDF, DOC, DOCX, or TXT) to get an AI-powered analysis and summary.
        </Typography>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <input
            accept=".pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            id="document-upload"
            type="file"
            onChange={handleFileUpload}
            disabled={isAnalyzing}
          />
          <label htmlFor="document-upload">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadIcon />}
              disabled={isAnalyzing}
              size="large"
            >
              {isAnalyzing ? 'Analyzing...' : 'Upload Document'}
            </Button>
          </label>
        </Box>

        {isAnalyzing && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              Analyzing document with AI...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {parsedAnalysis && (
        <Box>
          {/* Document Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Document Analysis Complete
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Successfully analyzed "{parsedAnalysis.documentName}" and found {parsedAnalysis.formFields.length} form fields.
              </Typography>
              
              {/* AI Document Summary */}
              {analysis.documentSummary && (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    <GavelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    AI Document Summary
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {analysis.documentSummary}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Analysis Statistics */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <GavelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Total Fields
                </Typography>
                <Typography variant="h4" color="primary">
                  {parsedAnalysis.analysis.totalFields || 0}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Empty Fields
                </Typography>
                <Typography variant="h4" color="error">
                  {parsedAnalysis.analysis.emptyFields || 0}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Confidence
                </Typography>
                <Typography variant="h4" color="primary">
                  {Math.round(parsedAnalysis.analysis.confidence || 0)}%
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Form Fields Found */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Form Fields Detected
              </Typography>
              <List>
                {parsedAnalysis.formFields.slice(0, 10).map((field, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {field.value && field.value.trim() ? (
                        <CheckIcon color="success" />
                      ) : (
                        <WarningIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={field.key}
                      secondary={field.value || 'Empty - needs to be filled'}
                    />
                  </ListItem>
                ))}
                {parsedAnalysis.formFields.length > 10 && (
                  <ListItem>
                    <ListItemText 
                      primary={`... and ${parsedAnalysis.formFields.length - 10} more fields`}
                      secondary="Scroll down to see all fields"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Questions Generated */}
          {parsedAnalysis.questions.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Questions to Complete Document
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We've generated {parsedAnalysis.questions.length} questions to help you fill in the missing information.
                </Typography>
                <List>
                  {parsedAnalysis.questions.slice(0, 5).map((question, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={question.question}
                        secondary={`Field: ${question.field} | Type: ${question.type}`}
                      />
                    </ListItem>
                  ))}
                  {parsedAnalysis.questions.length > 5 && (
                    <ListItem>
                      <ListItemText 
                        primary={`... and ${parsedAnalysis.questions.length - 5} more questions`}
                        secondary="Answer all questions to complete the document"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom color="primary">
            Next Steps
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {parsedAnalysis.questions.length > 0 
              ? `We've identified ${parsedAnalysis.questions.length} questions that need to be answered to complete this document. Please proceed to answer these questions.`
              : 'This document appears to be complete or no additional information is needed.'
            }
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DocumentAnalyzer;