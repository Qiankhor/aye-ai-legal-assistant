import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DocumentAnalyzer from '../components/DocumentAnalyzer';
import DocumentQAFiller from '../components/DocumentQAFiller';

export default function ScannerPage() {
  const [analysisData, setAnalysisData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQAFiller, setShowQAFiller] = useState(false);

  const handleAnalysisComplete = (analysis, documentName) => {
    setAnalysisData(analysis);
    setShowQAFiller(true);
  };

  const handleQuestionsGenerated = (generatedQuestions) => {
    setQuestions(generatedQuestions);
  };

  const handleDocumentComplete = (filledDocument, summary) => {
    console.log('Document completed:', filledDocument);
    console.log('Summary:', summary);
    // Reset the state to allow uploading another document
    setAnalysisData(null);
    setQuestions([]);
    setShowQAFiller(false);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Document Analysis & Completion
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload a legal document to analyze its form fields and complete missing information through an interactive Q&A process.
      </Typography>

      {!showQAFiller ? (
        <DocumentAnalyzer
          onAnalysisComplete={handleAnalysisComplete}
          onQuestionsGenerated={handleQuestionsGenerated}
        />
      ) : (
        <DocumentQAFiller
          questions={questions}
          documentName={analysisData?.documentName}
          originalFields={analysisData?.formFields || []}
          onComplete={handleDocumentComplete}
        />
      )}
    </Box>
  );
}

