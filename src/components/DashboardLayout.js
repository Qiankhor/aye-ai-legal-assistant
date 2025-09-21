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
import Tooltip from '@mui/material/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const drawerWidth = 260;


function NavItem({ to, icon, label, onClick }) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={NavLink}
        to={to}
        onClick={onClick}
        sx={{
          borderRadius: 1,
          mx: 1
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
  const [desktopOpen, setDesktopOpen] = React.useState(true);
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleDesktopDrawerToggle = () => setDesktopOpen(!desktopOpen);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, backgroundImage: 'linear-gradient(180deg, rgba(139, 92, 246, 0.15), rgba(255,255,255,0))' }}>
        
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ mt: 1 }}>
          <NavItem to="/home" icon={<HomeIcon />} label="Home" onClick={() => setMobileOpen(false)} />
          <NavItem to="/chat" icon={<ChatIcon />} label="Chatbot" onClick={() => setMobileOpen(false)} />
          <NavItem to="/templates" icon={<DescriptionIcon />} label="Templates Library" onClick={() => setMobileOpen(false)} />
          <NavItem to="/compare" icon={<CompareArrowsIcon />} label="Compare" onClick={() => setMobileOpen(false)} />
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
          width: '100%' // Ensure AppBar spans full width
        }}
      >
        <Toolbar>
          <IconButton 
            color="inherit" 
            edge="start" 
            onClick={handleDrawerToggle} 
            sx={{ mr: 2, display: { xs: 'block', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton 
            color="inherit" 
            edge="start" 
            onClick={handleDesktopDrawerToggle} 
            sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            AYE Legal Assistant
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: 0, flexShrink: 0 }} // Remove width since drawer is positioned absolutely
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
              top: '64px', // Position under AppBar
              height: 'calc(100vh - 64px)' // Adjust height
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
              width: desktopOpen ? drawerWidth : 0,
              transition: 'width 0.3s ease',
              overflow: 'hidden',
              top: '20px', // Position under AppBar
              height: 'calc(100vh - 64px)' // Adjust height
            }
          }}
          open={desktopOpen}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 1, sm: 2 }, 
        width: '100%',
        transition: 'margin-left 0.3s ease',
        marginLeft: { sm: desktopOpen ? `${drawerWidth}px` : 0 },
        marginTop: '64px',
        minHeight: 'calc(100vh - 64px)', // Minimum height to fill viewport
        overflowY: 'auto' // Allow vertical scrolling
      }}>
        <Outlet />
      </Box>
    </Box>
  );
}

