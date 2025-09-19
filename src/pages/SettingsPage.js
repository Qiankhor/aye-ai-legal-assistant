import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';

export default function SettingsPage() {
  const [name, setName] = React.useState('Admin User');
  const [email, setEmail] = React.useState('admin@example.com');

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Settings</Typography>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 420 }}>
          <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField size="small" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="contained">Save (Mock)</Button>
        </Box>
      </Paper>
    </Box>
  );
}

