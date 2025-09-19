import React from 'react';
import Container from '@mui/material/Container';

export default function ChatbotPage({ children }) {
  return (
    <Container maxWidth="lg" sx={{ py: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {children}
    </Container>
  );
}

