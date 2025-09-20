import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Mock data - in real app, this would come from your backend/AI service
const mockTodos = [
  { id: 1, task: 'Review NDA clauses for intellectual property risks', completed: false, dueDate: '2025-09-22' },
  { id: 2, task: 'Update employment contract template with new labor laws', completed: true, dueDate: '2025-09-20' },
  { id: 3, task: 'Prepare partnership agreement for client meeting', completed: false, dueDate: '2025-09-23' },
  { id: 4, task: 'Research compliance requirements for new business registration', completed: false, dueDate: '2025-09-25' }
];

const mockFiles = [
  { id: 1, name: 'NDA_Analysis_Report.pdf', type: 'pdf', size: '2.4 MB', date: '2025-09-20' },
  { id: 2, name: 'Contract_Risk_Assessment.docx', type: 'docx', size: '1.8 MB', date: '2025-09-19' },
  { id: 3, name: 'Legal_Research_Summary.pdf', type: 'pdf', size: '3.2 MB', date: '2025-09-18' },
  { id: 4, name: 'Client_Meeting_Notes.txt', type: 'txt', size: '0.5 MB', date: '2025-09-17' }
];

export default function AIWorkspacePage() {
  const [todos, setTodos] = useState(mockTodos);
  const [files, setFiles] = useState(mockFiles);

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const deleteFile = (id) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <DescriptionIcon color="error" />;
      case 'docx': return <DescriptionIcon color="primary" />;
      case 'txt': return <DescriptionIcon color="action" />;
      default: return <DescriptionIcon />;
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        My Workspace
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* To-Do List Section */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                To-Do List
              </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<AddIcon />}
                >
                  Add Task
                </Button>
              </Box>
              
              <List>
                {todos.map((todo, index) => (
                  <React.Fragment key={todo.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <IconButton onClick={() => toggleTodo(todo.id)} size="small">
                          {todo.completed ? 
                            <CheckCircleIcon color="success" /> : 
                            <RadioButtonUncheckedIcon />
                          }
                        </IconButton>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            sx={{ 
                              textDecoration: todo.completed ? 'line-through' : 'none',
                              color: todo.completed ? 'text.secondary' : 'text.primary',
                              fontSize: '0.95rem'
                            }}
                          >
                            {todo.task}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            Due: {todo.dueDate}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => deleteTodo(todo.id)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < todos.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              {todos.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks yet. Add your first task!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

        {/* File Storage Section */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                My Files
              </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<CloudUploadIcon />}
                >
                  Upload File
                </Button>
              </Box>
              
              <List>
                {files.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        {getFileIcon(file.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography sx={{ fontSize: '0.95rem' }}>
                            {file.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {file.size} • {file.date}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" sx={{ mr: 1 }}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => deleteFile(file.id)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < files.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              
              {files.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No files stored yet. Upload your first file!
                  </Typography>
                </Box>
                )}
            </CardContent>
          </Card>
      </Box>
    </Box>
  );
}
