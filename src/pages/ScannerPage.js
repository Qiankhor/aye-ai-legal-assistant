import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';

export default function ScannerPage() {
  const [fileName, setFileName] = React.useState(null);
  const [results, setResults] = React.useState(null);

  const handleMockScan = () => {
    setResults({
      risks: [
        { level: 'High', snippet: 'Personal liability for indirect damages.', reason: 'Uncapped liability clause', action: 'Negotiate a cap or exclude indirect damages.' },
        { level: 'Medium', snippet: 'Auto-renewal after 12 months.', reason: 'Renewal term without notice', action: 'Add 30-day prior notice requirement.' },
        { level: 'Low', snippet: 'Standard confidentiality obligations.', reason: 'Market standard', action: 'No action needed.' }
      ]
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Scanner</Typography>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" component="label">
            Upload Document
            <input type="file" hidden onChange={(e) => setFileName(e.target.files?.[0]?.name || null)} />
          </Button>
          {fileName && <Typography variant="body2">{fileName}</Typography>}
          <Button variant="contained" onClick={handleMockScan} disabled={!fileName}>Scan (Mock)</Button>
        </Stack>
      </Paper>

      {results && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Clause Risk Detector</Typography>
          {results.risks.map((r, i) => (
            <Box key={i} sx={{ mb: 1 }}>
              <Chip size="small" color={r.level === 'High' ? 'error' : r.level === 'Medium' ? 'warning' : 'success'} label={r.level} sx={{ mr: 1 }} />
              <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>{r.snippet}</Typography>
              <Typography variant="body2" color="text.secondary">Reason: {r.reason}. Suggestion: {r.action}</Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

