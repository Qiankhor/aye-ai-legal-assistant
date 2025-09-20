import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const DocumentQAFiller = ({ questions, documentName, originalFields, onComplete }) => {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [completedDocument, setCompletedDocument] = useState(null);

  useEffect(() => {
    // Initialize answers with existing field values
    const initialAnswers = {};
    originalFields.forEach(field => {
      if (field.value && field.value.trim()) {
        initialAnswers[field.key] = field.value;
      }
    });
    setAnswers(initialAnswers);
  }, [originalFields]);

  const handleAnswerChange = (field, value) => {
    setAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/documents/fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentName,
          answers,
          originalFields
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCompletedDocument(data.filledDocument);
        onComplete(data.filledDocument, data.summary);
      } else {
        setError(data.error || 'Failed to complete document');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadDocument = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentName, 
          filledFields: Object.entries(answers).map(([key, value]) => ({ key, value })),
          originalFields 
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `completed_${documentName}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to generate document');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Document generation error:', err);
    }
  };

  const renderQuestionInput = (question) => {
    const value = answers[question.field] || '';

    switch (question.type) {
      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{question.question}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleAnswerChange(question.field, e.target.value)}
              label={question.question}
            >
              {question.options?.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={value === 'true' || value === true}
                onChange={(e) => handleAnswerChange(question.field, e.target.checked.toString())}
              />
            }
            label={question.question}
          />
        );

      case 'radio':
        return (
          <FormControl component="fieldset">
            <Typography variant="subtitle1" gutterBottom>
              {question.question}
            </Typography>
            <RadioGroup
              value={value}
              onChange={(e) => handleAnswerChange(question.field, e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={question.question}
            value={value}
            onChange={(e) => handleAnswerChange(question.field, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={question.question}
            value={value}
            onChange={(e) => handleAnswerChange(question.field, e.target.value)}
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            type="email"
            label={question.question}
            value={value}
            onChange={(e) => handleAnswerChange(question.field, e.target.value)}
          />
        );

      case 'phone':
        return (
          <TextField
            fullWidth
            type="tel"
            label={question.question}
            value={value}
            onChange={(e) => handleAnswerChange(question.field, e.target.value)}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            multiline={question.question.length > 100}
            rows={question.question.length > 100 ? 3 : 1}
            label={question.question}
            value={value}
            onChange={(e) => handleAnswerChange(question.field, e.target.value)}
            placeholder={`Enter ${question.field.toLowerCase().replace(/_/g, ' ')}`}
          />
        );
    }
  };

  const getProgressPercentage = () => {
    const answeredQuestions = questions.filter(q => answers[q.field] && answers[q.field].trim());
    return (answeredQuestions.length / questions.length) * 100;
  };

  if (completedDocument) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Document Completed Successfully!
          </Typography>
          <Typography variant="h6" gutterBottom>
            {documentName}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your document has been filled with all the provided information and is ready for download.
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            sx={{ mr: 2 }}
            onClick={handleDownloadDocument}
          >
            Download Completed Document
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              setCompletedDocument(null);
              setCurrentStep(0);
              setAnswers({});
            }}
          >
            Fill Another Document
          </Button>
        </Paper>
      </Box>
    );
  }

  if (questions.length === 0) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Questions Required
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            This document appears to be complete and doesn't require additional information.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // TODO: Implement download for completed documents
              alert('Document is already complete');
            }}
          >
            Download Document
          </Button>
        </Paper>
      </Box>
    );
  }

  const currentQuestion = questions[currentStep];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom color="primary">
          Complete Your Document
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Answer the questions below to fill in the missing information in "{documentName}"
        </Typography>

        {/* Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress: {Math.round(getProgressPercentage())}% Complete
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Question {currentStep + 1} of {questions.length}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={getProgressPercentage()} 
            sx={{ mb: 2 }}
          />
        </Box>

        {/* Stepper */}
        <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
          {questions.map((question, index) => (
            <Step key={index}>
              <StepLabel>
                {answers[question.field] ? (
                  <CheckIcon color="success" />
                ) : (
                  <WarningIcon color="warning" />
                )}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Current Question */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip 
                label={`Question ${currentStep + 1}`} 
                color="primary" 
                size="small" 
                sx={{ mr: 2 }}
              />
              <Chip 
                label={currentQuestion.type} 
                color="secondary" 
                size="small" 
                variant="outlined"
              />
              {currentQuestion.required && (
                <Chip 
                  label="Required" 
                  color="error" 
                  size="small" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            
            {renderQuestionInput(currentQuestion)}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          {currentStep === questions.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<CheckIcon />}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Completing Document...' : 'Complete Document'}
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>

      {/* Summary of Answers */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Your Answers So Far
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(answers).map(([field, value]) => (
            <Chip
              key={field}
              label={`${field}: ${value}`}
              color={value ? 'success' : 'default'}
              size="small"
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default DocumentQAFiller;
