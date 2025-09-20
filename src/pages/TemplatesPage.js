import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

const templates = [
  { id: 'nda', title: 'Non-Disclosure Agreement', category: 'NDA' },
  { id: 'lease', title: 'Residential Tenancy Agreement', category: 'Tenancy' },
  { id: 'service', title: 'Service Agreement', category: 'Services' }
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates;
    }
    
    const query = searchQuery.toLowerCase();
    return templates.filter(template => 
      template.title.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Templates Library</Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search templates by name or category..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 500,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Box>

      {filteredTemplates.length === 0 && searchQuery.trim() && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No templates found matching "{searchQuery}"
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {filteredTemplates.map(t => (
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

