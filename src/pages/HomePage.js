import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useNavigate } from 'react-router-dom';

function KpiCard({ title, value, subtitle, color }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: color || 'text.primary' }}>{value}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Overview</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Active Documents" value="42" subtitle="Across all clients" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Pending Signatures" value="8" subtitle="Awaiting recipients" color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="High-Risk Clauses" value="5" subtitle="Needs attention" color="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Templates Used" value="17" subtitle="This month" color="success.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button variant="contained" onClick={() => navigate('/chat')}>Ask the Chatbot</Button>
                <Button variant="outlined" onClick={() => navigate('/compare')}>Compare Contracts</Button>
                <Button variant="outlined" onClick={() => navigate('/templates')}>Browse Templates</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Recent Activity</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" color="primary" label="Viewed" />
                  <Typography variant="body2">NDA (Acme Co.) opened by john@acme.com</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" color="success" label="Signed" />
                  <Typography variant="body2">Service Agreement signed by jane@startup.io</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" color="warning" label="Attention" />
                  <Typography variant="body2">Lease includes auto-renewal clause (12 months)</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

