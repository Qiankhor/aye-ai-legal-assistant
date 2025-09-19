import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

export default function ComparePage() {
  const [leftDoc, setLeftDoc] = React.useState(null);
  const [rightDoc, setRightDoc] = React.useState(null);
  const [diff, setDiff] = React.useState(null);

  const mockCompare = () => {
    setDiff({ summary: '2 additions, 1 deletion, 3 modified clauses', items: [
      { type: 'added', text: 'Add termination for convenience (30 days notice).' },
      { type: 'removed', text: 'Remove unilateral price increase.' },
      { type: 'changed', text: 'Payment terms from 30 to 45 days.' }
    ]});
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Compare Documents</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Document A</Typography>
            <Button variant="outlined" component="label" sx={{ mt: 1 }}>
              Upload A
              <input type="file" hidden onChange={(e) => setLeftDoc(e.target.files?.[0]?.name || null)} />
            </Button>
            {leftDoc && <Typography variant="body2" sx={{ mt: 1 }}>{leftDoc}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Document B</Typography>
            <Button variant="outlined" component="label" sx={{ mt: 1 }}>
              Upload B
              <input type="file" hidden onChange={(e) => setRightDoc(e.target.files?.[0]?.name || null)} />
            </Button>
            {rightDoc && <Typography variant="body2" sx={{ mt: 1 }}>{rightDoc}</Typography>}
          </Paper>
        </Grid>
      </Grid>

      <Button variant="contained" sx={{ mt: 2 }} disabled={!leftDoc || !rightDoc} onClick={mockCompare}>Compare (Mock)</Button>

      {diff && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Summary</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>{diff.summary}</Typography>
          {diff.items.map((d, i) => (
            <Typography key={i} variant="body2" sx={{
              color: d.type === 'added' ? 'success.main' : d.type === 'removed' ? 'error.main' : 'warning.main'
            }}>
              {d.type.toUpperCase()}: {d.text}
            </Typography>
          ))}
        </Paper>
      )}
    </Box>
  );
}

