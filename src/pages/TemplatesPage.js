import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';

const templates = [
  // Business & Commercial Documents
  { id: 'business-registration-sole', title: 'Business Registration Forms - Sole Proprietorship', category: 'Business & Commercial' },
  { id: 'business-registration-partnership', title: 'Business Registration Forms - Partnership (SSM)', category: 'Business & Commercial' },
  { id: 'shareholders-agreement', title: 'Shareholders\' Agreement', category: 'Business & Commercial' },
  { id: 'partnership-agreement', title: 'Partnership Agreement', category: 'Business & Commercial' },
  { id: 'nda', title: 'Non-Disclosure Agreement (NDA)', category: 'Business & Commercial' },
  { id: 'employment-contract', title: 'Employment Contract Template', category: 'Business & Commercial' },
  { id: 'consultancy-agreement', title: 'Consultancy / Service Agreement', category: 'Business & Commercial' },
  { id: 'invoice-template', title: 'Invoice & Payment Terms Template', category: 'Business & Commercial' },

  // Tenancy & Property Documents
  { id: 'residential-tenancy', title: 'Residential Tenancy Agreement', category: 'Tenancy & Property' },
  { id: 'commercial-lease', title: 'Commercial Lease Agreement', category: 'Tenancy & Property' },
  { id: 'demand-letter-tenant', title: 'Letter of Demand / Notice to Tenant', category: 'Tenancy & Property' },
  { id: 'property-sale-checklist', title: 'Property Sale & Purchase Checklist', category: 'Tenancy & Property' },

  // Personal & Family Law Documents
  { id: 'will-testament', title: 'Will / Testament Template', category: 'Personal & Family Law' },
  { id: 'power-of-attorney', title: 'Letter of Authorization / Power of Attorney', category: 'Personal & Family Law' },
  { id: 'minor-travel-consent', title: 'Consent Letter for Minor Travel', category: 'Personal & Family Law' },

  // Financial & Miscellaneous
  { id: 'loan-agreement', title: 'Loan Agreement / IOU Template', category: 'Financial & Miscellaneous' },
  { id: 'promissory-note', title: 'Promissory Note', category: 'Financial & Miscellaneous' },
  { id: 'settlement-agreement', title: 'Settlement Agreement Template', category: 'Financial & Miscellaneous' }
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) 
                            || template.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || template.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>Templates Library</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search templates by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

        <TextField
          select
          label="Filter by Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {categories.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </TextField>
      </Box>

      {filteredTemplates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No templates found.
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {filteredTemplates.map(t => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card sx={{ width: 300, height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2 }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">{t.category}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>{t.title}</Typography>
              </CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Button variant="outlined">Preview</Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
