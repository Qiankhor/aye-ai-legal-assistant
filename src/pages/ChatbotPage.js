import React from 'react';
import Box from '@mui/material/Box';

export default function ChatbotPage({ children }) {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      minHeight: 0,
      width: '100%',
      height: '100%'
    }}>
      {children}
    </Box>
  );
}

