import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import { styled, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsIcon from '@mui/icons-material/Settings';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const drawerWidth = 260;

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25)
  },
  marginLeft: 0,
  width: '100%'
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  paddingLeft: theme.spacing(2)
}));

function NavItem({ to, icon, label, onClick }) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={NavLink}
        to={to}
        onClick={onClick}
        sx={{
          borderRadius: 1,
          mx: 1,
          '&.active': {
            bgcolor: 'action.selected'
          }
        }}
      >
        <ListItemIcon>
          {icon}
        </ListItemIcon>
        <ListItemText primary={label} />
      </ListItemButton>
    </ListItem>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, backgroundImage: 'linear-gradient(180deg, rgba(135,206,250,0.15), rgba(255,255,255,0))' }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
          AYE Legal Assistant
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Making legal simple
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ mt: 1 }}>
          <NavItem to="/home" icon={<HomeIcon />} label="Home / Overview" onClick={() => setMobileOpen(false)} />
          <NavItem to="/chat" icon={<ChatIcon />} label="Chatbot & Guided Q&A" onClick={() => setMobileOpen(false)} />
          <NavItem to="/templates" icon={<DescriptionIcon />} label="Templates Library" onClick={() => setMobileOpen(false)} />
          <NavItem to="/scanner" icon={<DocumentScannerIcon />} label="Scanner" onClick={() => setMobileOpen(false)} />
          <NavItem to="/compare" icon={<CompareArrowsIcon />} label="Compare" onClick={() => setMobileOpen(false)} />
          <NavItem to="/tracker" icon={<TimelineIcon />} label="Tracker" onClick={() => setMobileOpen(false)} />
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
            Admin User
          </Typography>
          <Typography noWrap variant="caption" color="text.secondary">
            admin@example.com
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Settings">
          <IconButton size="small" onClick={() => navigate('/settings')}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundImage: 'linear-gradient(90deg, #87cefa 0%, #bde3ff 100%)',
          color: '#0b2340',
          boxShadow: '0 2px 10px rgba(135,206,250,0.4)'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            AYE Legal Assistant
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ width: 360, maxWidth: '50%', display: { xs: 'none', sm: 'block' } }}>
            <Search>
              <SearchInput placeholder="Search documents, people, clauses…" inputProps={{ 'aria-label': 'search' }} />
            </Search>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="sidebar navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(180deg, rgba(135,206,250,0.08), rgba(255,255,255,0))',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffff',
              backgroundImage: 'linear-gradient(180deg, rgba(135,206,250,0.08), rgba(255,255,255,0))',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Toolbar />
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

