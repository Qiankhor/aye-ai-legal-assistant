import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const templates = [
  { id: 'nda', title: 'Non-Disclosure Agreement', category: 'NDA' },
  { id: 'lease', title: 'Residential Tenancy Agreement', category: 'Tenancy' },
  { id: 'service', title: 'Service Agreement', category: 'Services' }
];

export default function TemplatesPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Templates Library</Typography>
      <Grid container spacing={2}>
        {templates.map(t => (
          <Grid item xs={12} md={6} lg={4} key={t.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">{t.category}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{t.title}</Typography>
                <Button variant="outlined" sx={{ mt: 1 }}>Preview</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

