import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledQuestionCard = styled(Card)(({ theme, category }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    borderColor: category === 'risk' ? '#f59e0b' : theme.palette.primary.main,
  },
  '&:active': {
    transform: 'translateY(0px)',
  },
  ...(category === 'risk' && {
    border: '2px solid #f59e0b',
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
  }),
}));

const QuestionIcon = styled('span')(({ theme }) => ({
  fontSize: '1.5rem',
  marginRight: theme.spacing(1),
  display: 'inline-block',
}));

const CategoryChip = styled(Chip)(({ category }) => ({
  fontSize: '0.75rem',
  height: '20px',
  ...(category === 'risk' && {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontWeight: 'bold',
  }),
  ...(category === 'financial' && {
    backgroundColor: '#dcfce7',
    color: '#166534',
  }),
  ...(category === 'obligations' && {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  }),
  ...(category === 'general' && {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  }),
}));

const RiskLevelIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

function PredefinedQuestions({ 
  questions, 
  onQuestionClick, 
  disabled = false,
  riskLevels 
}) {
  if (!questions || questions.length === 0) {
    return null;
  }

  const handleQuestionClick = (question) => {
    if (disabled) return;
    onQuestionClick(question);
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: '#fafafa',
        border: '1px solid #e0e0e0'
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          color: '#333',
          fontWeight: 600,
          fontSize: '1rem',
          mb: 2
        }}
      >
        📋 Quick Legal Analysis
      </Typography>
      
      <Grid container spacing={1.5}>
        {questions.map((question) => (
          <Grid item xs={12} sm={6} md={4} key={question.id}>
            <Tooltip 
              title={question.description}
              arrow
              placement="top"
            >
              <StyledQuestionCard
                category={question.category}
                onClick={() => handleQuestionClick(question)}
                sx={{ 
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <QuestionIcon>{question.icon}</QuestionIcon>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          lineHeight: 1.2,
                          color: '#333'
                        }}
                      >
                        {question.text}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CategoryChip 
                      label={question.category}
                      category={question.category}
                      size="small"
                    />
                    
                    {question.id === 'risk-detector' && riskLevels && (
                      <RiskLevelIndicator>
                        <span>{riskLevels.STANDARD.emoji}</span>
                        <span>{riskLevels.ATTENTION.emoji}</span>
                        <span>{riskLevels.HIGH_RISK.emoji}</span>
                      </RiskLevelIndicator>
                    )}
                  </Box>
                </CardContent>
              </StyledQuestionCard>
            </Tooltip>
          </Grid>
        ))}
      </Grid>
      
      {disabled && (
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            textAlign: 'center',
            mt: 1,
            color: 'text.secondary',
            fontStyle: 'italic'
          }}
        >
          Please upload a document first to enable quick analysis
        </Typography>
      )}
    </Paper>
  );
}

export default PredefinedQuestions;
