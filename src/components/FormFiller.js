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
  Radio,
  RadioGroup,
  // FormLabel,
  // Stepper,
  // Step,
  // StepLabel,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  CheckCircle as CheckIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

const FormFiller = ({ questions, onFormComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize answers with empty values
    const initialAnswers = {};
    questions.forEach(q => {
      initialAnswers[q.id] = q.type === 'checkbox' ? [] : '';
    });
    setAnswers(initialAnswers);
  }, [questions]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onFormComplete(answers);
    } catch (err) {
      setError('Failed to generate document. Please try again.');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <TextField
            fullWidth
            type={question.type}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.example || ''}
            helperText={question.validation || ''}
            required={question.required}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.example || ''}
            helperText={question.validation || ''}
            required={question.required}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.example || ''}
            helperText={question.validation || ''}
            required={question.required}
          />
        );

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            InputLabelProps={{ shrink: true }}
            required={question.required}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth required={question.required}>
            <InputLabel>{question.question}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              {question.options?.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl component="fieldset" required={question.required}>
            <RadioGroup
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
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

      case 'checkbox':
        return (
          <Box>
            {question.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                control={
                  <Checkbox
                    checked={value.includes(option)}
                    onChange={(e) => {
                      const newValue = e.target.checked
                        ? [...value, option]
                        : value.filter(v => v !== option);
                      handleAnswerChange(question.id, newValue);
                    }}
                  />
                }
                label={option}
              />
            ))}
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.example || ''}
            helperText={question.validation || ''}
            required={question.required}
          />
        );
    }
  };

  const getProgress = () => {
    return ((currentStep + 1) / questions.length) * 100;
  };

  const isCurrentQuestionValid = () => {
    const question = questions[currentStep];
    const value = answers[question.id];
    
    if (question.required) {
      if (question.type === 'checkbox') {
        return Array.isArray(value) && value.length > 0;
      }
      return value && value.toString().trim() !== '';
    }
    return true;
  };

  if (questions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No questions available. Please analyze a document first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom color="primary">
          <DocumentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Complete Your Document
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please answer the following questions to complete your legal document. 
          All required fields must be filled.
        </Typography>

        {/* Progress Stepper */}
        <Box sx={{ mb: 4 }}>
          <LinearProgress 
            variant="determinate" 
            value={getProgress()} 
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Question {currentStep + 1} of {questions.length} 
            ({Math.round(getProgress())}% complete)
          </Typography>
        </Box>

        {/* Current Question */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {questions[currentStep].question}
              {questions[currentStep].required && (
                <Chip label="Required" color="error" size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            
            {questions[currentStep].validation && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {questions[currentStep].validation}
              </Typography>
            )}

            {renderQuestionInput(questions[currentStep])}
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBack}
            disabled={currentStep === 0 && !onBack}
          >
            {currentStep === 0 ? 'Back to Analysis' : 'Previous'}
          </Button>

          <Box>
            {currentStep < questions.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={handleNext}
                disabled={!isCurrentQuestionValid()}
              >
                Next Question
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={handleSubmit}
                disabled={!isCurrentQuestionValid() || isSubmitting}
              >
                {isSubmitting ? 'Generating Document...' : 'Complete Document'}
              </Button>
            )}
          </Box>
        </Box>

        {/* Summary of Answers */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>
          Your Answers Summary
        </Typography>
        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
          {Object.entries(answers).map(([questionId, answer]) => {
            const question = questions.find(q => q.id === questionId);
            if (!question || !answer || (Array.isArray(answer) && answer.length === 0)) return null;
            
            return (
              <Box key={questionId} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>{question.question}:</strong> {
                    Array.isArray(answer) ? answer.join(', ') : answer
                  }
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default FormFiller;