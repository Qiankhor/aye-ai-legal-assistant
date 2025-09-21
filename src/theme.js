import { createTheme } from '@mui/material/styles';

// Lavender color palette
const lavenderPalette = {
  // Primary lavender shades
  primary: {
    50: '#f3f0ff',
    100: '#e9e5ff',
    200: '#d6ccff',
    300: '#b8a9ff',
    400: '#9d7aff',
    500: '#8b5cf6', // Main lavender
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    main: '#8b5cf6',
    light: '#b8a9ff',
    dark: '#6d28d9',
    contrastText: '#ffffff',
  },
  // Secondary complementary colors (soft purple-pink)
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef', // Main secondary
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    main: '#d946ef',
    light: '#e879f9',
    dark: '#a21caf',
    contrastText: '#ffffff',
  },
  // Error colors (keeping standard red but with lavender tint)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    main: '#ef4444',
    light: '#f87171',
    dark: '#b91c1c',
    contrastText: '#ffffff',
  },
  // Warning colors (lavender-tinted amber)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#b45309',
    contrastText: '#000000',
  },
  // Success colors (lavender-tinted green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    main: '#22c55e',
    light: '#4ade80',
    dark: '#15803d',
    contrastText: '#ffffff',
  },
  // Info colors (lavender-tinted blue)
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#1d4ed8',
    contrastText: '#ffffff',
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    ...lavenderPalette,
    background: {
      default: '#fefefe',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
    divider: 'rgba(139, 92, 246, 0.12)', // Lavender-tinted divider
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // AppBar customization
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#9d7aff', // Using the hover color from nav items
          color: '#ffffff', // White text for better contrast
          boxShadow: '0 2px 10px rgba(139, 92, 246, 0.2)',
        },
      },
    },
    // ListItemButton customization for navigation
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.active': {
            backgroundColor: '#b8a9ff', // Light purple background
            color: '#ffffff', // White text
            '& .MuiListItemIcon-root': {
              color: '#ffffff', // White icon
            },
            '& .MuiListItemText-primary': {
              color: '#ffffff', // White text
              fontWeight: 600,
            },
            '&:hover': {
              backgroundColor: '#9d7aff', // Slightly darker purple on hover
            },
          },
        },
      },
    },
    // Button customization
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)',
          },
        },
      },
    },
    // Fab customization
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
          },
        },
      },
    },
    // Drawer customization
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08), rgba(255,255,255,0))',
          borderColor: 'rgba(139, 92, 246, 0.12)',
        },
      },
    },
    // Paper customization
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.12), 0 1px 2px rgba(139, 92, 246, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 6px rgba(139, 92, 246, 0.12), 0 2px 4px rgba(139, 92, 246, 0.08)',
        },
        elevation8: {
          boxShadow: '0 10px 25px rgba(139, 92, 246, 0.15), 0 4px 10px rgba(139, 92, 246, 0.1)',
        },
      },
    },
    // Chip customization
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          color: '#6d28d9',
          '&:hover': {
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
          },
        },
      },
    },
  },
});

export default theme;
