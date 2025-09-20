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
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';

const templates = [
  // Business & Commercial Documents
  { id: 'business-registration-sole', title: 'Business Registration Forms - Sole Proprietorship', category: 'Business & Commercial', description: 'Register your sole proprietorship business with SSM. Includes all required forms and documentation.' },
  { id: 'business-registration-partnership', title: 'Business Registration Forms - Partnership (SSM)', category: 'Business & Commercial', description: 'Complete partnership registration package for SSM filing with partnership deed templates.' },
  { id: 'shareholders-agreement', title: 'Shareholders\' Agreement', category: 'Business & Commercial', description: 'Define rights, responsibilities, and relationships between company shareholders.' },
  { id: 'partnership-agreement', title: 'Partnership Agreement', category: 'Business & Commercial', description: 'Establish terms for business partnerships including profit sharing and responsibilities.' },
  { id: 'nda', title: 'Non-Disclosure Agreement (NDA)', category: 'Business & Commercial', description: 'Protect confidential information shared between parties in business dealings.' },
  { id: 'employment-contract', title: 'Employment Contract Template', category: 'Business & Commercial', description: 'Standard employment agreement covering salary, benefits, and terms of employment.' },
  { id: 'consultancy-agreement', title: 'Consultancy / Service Agreement', category: 'Business & Commercial', description: 'Contract template for freelancers and service providers with clear scope and payment terms.' },
  { id: 'invoice-template', title: 'Invoice & Payment Terms Template', category: 'Business & Commercial', description: 'Professional invoice format with payment terms and late payment clauses.' },

  // Tenancy & Property Documents
  { id: 'residential-tenancy', title: 'Residential Tenancy Agreement', category: 'Tenancy & Property', description: 'Comprehensive rental agreement for residential properties with tenant and landlord obligations.' },
  { id: 'commercial-lease', title: 'Commercial Lease Agreement', category: 'Tenancy & Property', description: 'Commercial property lease with business-specific terms and conditions.' },
  { id: 'demand-letter-tenant', title: 'Letter of Demand / Notice to Tenant', category: 'Tenancy & Property', description: 'Formal notice templates for rent collection and tenancy violations.' },
  { id: 'property-sale-checklist', title: 'Property Sale & Purchase Checklist', category: 'Tenancy & Property', description: 'Step-by-step checklist for property transactions and due diligence.' },

  // Personal & Family Law Documents
  { id: 'will-testament', title: 'Will / Testament Template', category: 'Personal & Family Law', description: 'Create a legally valid will to distribute your assets and appoint guardians.' },
  { id: 'power-of-attorney', title: 'Letter of Authorization / Power of Attorney', category: 'Personal & Family Law', description: 'Grant legal authority to someone to act on your behalf in specific matters.' },
  { id: 'minor-travel-consent', title: 'Consent Letter for Minor Travel', category: 'Personal & Family Law', description: 'Parental consent for minors traveling domestically or internationally.' },

  // Financial & Miscellaneous
  { id: 'loan-agreement', title: 'Loan Agreement / IOU Template', category: 'Financial & Miscellaneous', description: 'Formal loan agreement with repayment terms and interest calculations.' },
  { id: 'promissory-note', title: 'Promissory Note', category: 'Financial & Miscellaneous', description: 'Simple promise to pay document for personal or business loans.' },
  { id: 'settlement-agreement', title: 'Settlement Agreement Template', category: 'Financial & Miscellaneous', description: 'Resolve disputes out of court with mutual agreement terms.' }
];

// Function to get color for each category
const getCategoryColor = (category) => {
  const colorMap = {
    'Business & Commercial': { color: '#1976d2', backgroundColor: '#e3f2fd' }, // Blue
    'Tenancy & Property': { color: '#388e3c', backgroundColor: '#e8f5e8' }, // Green
    'Personal & Family Law': { color: '#f57c00', backgroundColor: '#fff3e0' }, // Orange
    'Financial & Miscellaneous': { color: '#7b1fa2', backgroundColor: '#f3e5f5' } // Purple
  };
  return colorMap[category] || { color: '#666', backgroundColor: '#f5f5f5' };
};

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
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Templates Library</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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
        {filteredTemplates.map(t => {
          const categoryColors = getCategoryColor(t.category);
          return (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card sx={{ width: 300, height: 260, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 1.5 }}>
                <CardContent sx={{ flexGrow: 1, p: 1 }}>
                  <Chip 
                    label={t.category}
                    size="small"
                    sx={{
                      color: categoryColors.color,
                      backgroundColor: categoryColors.backgroundColor,
                      fontWeight: 500,
                      mb: 1,
                      fontSize: '0.75rem'
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5, mb: 1 }}>{t.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {t.description}
                  </Typography>
                </CardContent>
                <Box sx={{ textAlign: 'center', pb: 1 }}>
                  <Button variant="outlined">Preview</Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
