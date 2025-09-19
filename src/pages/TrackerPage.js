import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

const rows = [
  { id: 'DOC-001', name: 'NDA - Acme Co.', status: 'Viewed', lastEvent: '2025-09-12 10:24', actor: 'john@acme.com' },
  { id: 'DOC-002', name: 'Service Agreement', status: 'Sent', lastEvent: '2025-09-11 14:01', actor: 'system' },
  { id: 'DOC-003', name: 'Tenancy Contract', status: 'Signed', lastEvent: '2025-09-10 18:45', actor: 'jane@tenant.io' },
  { id: 'DOC-004', name: 'SOW - Alpha Ltd', status: 'Draft', lastEvent: '2025-09-09 09:16', actor: 'you' }
];

function StatusChip({ status }) {
  const map = {
    Draft: { color: 'default' },
    Sent: { color: 'info' },
    Viewed: { color: 'primary' },
    Signed: { color: 'success' }
  };
  const cfg = map[status] || { color: 'default' };
  return <Chip label={status} color={cfg.color} size="small" />;
}

export default function TrackerPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Smart Document Tracker</Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Event</TableCell>
              <TableCell>Actor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell><StatusChip status={row.status} /></TableCell>
                <TableCell>{row.lastEvent}</TableCell>
                <TableCell>{row.actor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Timeline (per-document)</Typography>
        <Typography variant="body2" color="text.secondary">
          Timeline visualization placeholder. In MVP, events update here in near-real-time (mocked).
        </Typography>
      </Paper>
    </Box>
  );
}

