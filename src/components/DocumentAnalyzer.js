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
      const response = await fetch('http://localhost:5001/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        onAnalysisComplete(data.analysis, data.documentType);
        
        // Generate questions
        await generateQuestions(data.analysis, data.documentType);
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
      const response = await fetch('http://localhost:5001/api/documents/generate-questions', {
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

  const parseAnalysis = (analysisText) => {
    // Simple parsing to extract structured information
    const sections = analysisText.split('\n').filter(line => line.trim());
    const result = {
      summary: '',
      documentType: '',
      parties: [],
      keyTerms: [],
      risks: [],
      dates: [],
      requiredInfo: []
    };

    let currentSection = '';
    sections.forEach(line => {
      if (line.toLowerCase().includes('summary')) {
        currentSection = 'summary';
      } else if (line.toLowerCase().includes('document type')) {
        currentSection = 'documentType';
      } else if (line.toLowerCase().includes('parties')) {
        currentSection = 'parties';
      } else if (line.toLowerCase().includes('terms')) {
        currentSection = 'keyTerms';
      } else if (line.toLowerCase().includes('risk')) {
        currentSection = 'risks';
      } else if (line.toLowerCase().includes('date')) {
        currentSection = 'dates';
      } else if (line.toLowerCase().includes('required')) {
        currentSection = 'requiredInfo';
      } else if (line.trim() && currentSection) {
        result[currentSection].push(line.trim());
      }
    });

    return result;
  };

  const parsedAnalysis = analysis ? parseAnalysis(analysis) : null;

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
                Document Summary
              </Typography>
              <Typography variant="body1">
                {parsedAnalysis.summary.join(' ') || 'Summary not available'}
              </Typography>
            </CardContent>
          </Card>

          {/* Key Information Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 3 }}>
            {/* Document Type */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <GavelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Document Type
                </Typography>
                <Chip 
                  label={parsedAnalysis.documentType.join(' ') || 'Unknown'} 
                  color="primary" 
                  variant="outlined" 
                />
              </CardContent>
            </Card>

            {/* Key Parties */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Key Parties
                </Typography>
                <List dense>
                  {parsedAnalysis.parties.slice(0, 3).map((party, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemText primary={party} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>

          {/* Important Terms */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Important Terms & Conditions
              </Typography>
              <List>
                {parsedAnalysis.keyTerms.slice(0, 5).map((term, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={term} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Potential Risks */}
          {parsedAnalysis.risks.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Potential Risks & Concerns
                </Typography>
                <List>
                  {parsedAnalysis.risks.slice(0, 5).map((risk, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="error" />
                      </ListItemIcon>
                      <ListItemText primary={risk} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Key Dates */}
          {parsedAnalysis.dates.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Important Dates
                </Typography>
                <List>
                  {parsedAnalysis.dates.slice(0, 5).map((date, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={date} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Required Information */}
          {parsedAnalysis.requiredInfo.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Information Required for Completion
                </Typography>
                <List>
                  {parsedAnalysis.requiredInfo.slice(0, 5).map((info, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={info} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom color="primary">
            Next Steps
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Based on the analysis, we'll now ask you some questions to help complete this document. 
            Please answer each question carefully to ensure accuracy.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DocumentAnalyzer;
