import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export function useWorkspaceViewModel() {
  // State management
  const [todos, setTodos] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Todo management
  const fetchTodos = useCallback(async (retryCount = 0) => {
    setIsLoadingTodos(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/workspace/todos`, {
        timeout: 5000 // 5 second timeout
      });
      if (response.data.success) {
        setTodos(response.data.todos);
      } else {
        throw new Error(response.data.error || 'Failed to fetch todos');
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to load todos';
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = 'Backend server not running. Please start the backend server.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Todos endpoint not found. Check backend configuration.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error while loading todos. Check backend logs.';
      } else if (error.response?.data?.error) {
        errorMessage = `Failed to load todos: ${error.response.data.error}`;
      }
      
      // Retry logic for connection errors
      if ((error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) && retryCount < 2) {
        console.log(`Retrying todos fetch... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => fetchTodos(retryCount + 1), 2000); // Retry after 2 seconds
        return;
      }
      
      setError(errorMessage);
      // Start with empty todos if API fails
      setTodos([]);
    } finally {
      setIsLoadingTodos(false);
    }
  }, []);

  const createTodo = useCallback(async (taskDescription, dueDate = null, documentTitle = null) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/todos`, {
        taskDescription,
        dueDate,
        documentTitle,
        emailContext: 'User created task from workspace'
      });

      if (response.data.success) {
        setTodos(prev => [...prev, response.data.todo]);
        return { success: true, todo: response.data.todo };
      } else {
        throw new Error(response.data.error || 'Failed to create todo');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      setError('Failed to create todo');
      return { success: false, error: error.message };
    }
  }, []);

  const toggleTodo = useCallback(async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newCompleted = !todo.completed;
    const newStatus = newCompleted ? 'completed' : 'pending';

    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, completed: newCompleted, status: newStatus } : t
    ));

    try {
      const response = await axios.put(`${API_BASE_URL}/workspace/todos/${id}`, {
        completed: newCompleted,
        status: newStatus
      });

      if (!response.data.success) {
        // Revert on failure
        setTodos(prev => prev.map(t => 
          t.id === id ? { ...t, completed: todo.completed, status: todo.status } : t
        ));
        throw new Error(response.data.error || 'Failed to update todo');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      setError('Failed to update todo');
      // Revert optimistic update
      setTodos(prev => prev.map(t => 
        t.id === id ? { ...t, completed: todo.completed, status: todo.status } : t
      ));
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id) => {
    // Optimistic update
    const originalTodos = todos;
    setTodos(prev => prev.filter(t => t.id !== id));

    try {
      const response = await axios.delete(`${API_BASE_URL}/workspace/todos/${id}`);
      
      if (!response.data.success) {
        // Revert on failure
        setTodos(originalTodos);
        throw new Error(response.data.error || 'Failed to delete todo');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      setError('Failed to delete todo');
      // Revert optimistic update
      setTodos(originalTodos);
    }
  }, [todos]);

  // File management
  const fetchFiles = useCallback(async (retryCount = 0) => {
    setIsLoadingFiles(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/workspace/files`, {
        timeout: 5000 // 5 second timeout
      });
      if (response.data.success) {
        setFiles(response.data.files);
      } else {
        throw new Error(response.data.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to load files';
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = 'Backend server not running. Please start the backend server.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Files endpoint not found. Check backend configuration.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error while loading files. Check backend logs.';
      } else if (error.response?.data?.error) {
        errorMessage = `Failed to load files: ${error.response.data.error}`;
      }
      
      // Retry logic for connection errors
      if ((error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) && retryCount < 2) {
        console.log(`Retrying files fetch... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => fetchFiles(retryCount + 1), 2000); // Retry after 2 seconds
        return;
      }
      
      setError(errorMessage);
      // Start with empty files if API fails
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const uploadFile = useCallback(async (file, documentType = 'legal_document') => {
    try {
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File is too large. Maximum size is 50MB, but file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];
      const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      
      const isValidType = allowedTypes.includes(file.type) || 
                         allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidType) {
        throw new Error('Invalid file type. Please upload PDF, DOCX, DOC, or TXT files only.');
      }

      // Convert file to base64 for API
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await axios.post(`${API_BASE_URL}/workspace/files`, {
        documentName: file.name,
        documentContent: fileContent,
        documentType: documentType,
        analysisResults: 'File uploaded from workspace'
      }, {
        timeout: 60000, // 60 second timeout for large files
        maxContentLength: 52428800, // 50MB
        maxBodyLength: 52428800 // 50MB
      });

      if (response.data.success) {
        setFiles(prev => [...prev, response.data.file]);
        setSuccessMessage(`File "${file.name}" uploaded successfully!`);
        return { success: true, file: response.data.file };
      } else {
        throw new Error(response.data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      let errorMessage = 'Failed to upload file';
      if (error.response?.status === 413) {
        errorMessage = 'File is too large for upload. Please use a smaller file.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const deleteFile = useCallback(async (id) => {
    // Optimistic update
    const originalFiles = files;
    setFiles(prev => prev.filter(f => f.id !== id));

    try {
      const response = await axios.delete(`${API_BASE_URL}/workspace/files/${id}`);
      
      if (!response.data.success) {
        // Revert on failure
        setFiles(originalFiles);
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
      // Revert optimistic update
      setFiles(originalFiles);
    }
  }, [files]);

  // AI-powered features
  const generateAITasks = useCallback(async (context, documentTitle = null) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/ai/generate-tasks`, {
        context,
        documentTitle,
        priority: 'medium'
      });

      if (response.data.success) {
        return { 
          success: true, 
          suggestedTasks: response.data.suggestedTasks 
        };
      } else {
        throw new Error(response.data.error || 'Failed to generate AI tasks');
      }
    } catch (error) {
      console.error('Error generating AI tasks:', error);
      return { 
        success: false, 
        error: error.message,
        // Fallback suggestions
        suggestedTasks: [
          {
            task: `Review and analyze ${documentTitle || 'the document'} for compliance`,
            priority: 'medium',
            estimatedTime: '2 hours',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ]
      };
    }
  }, []);

  const analyzeFile = useCallback(async (fileId, analysisType = 'comprehensive') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/ai/analyze-file`, {
        fileId,
        analysisType
      });

      if (response.data.success) {
        setSuccessMessage('File analysis completed successfully!');
        return { success: true, analysis: response.data.analysis };
      } else {
        throw new Error(response.data.error || 'Failed to analyze file');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      setError('Failed to analyze file');
      return { success: false, error: error.message };
    }
  }, []);

  // Advanced legal consultation
  const getLegalConsultation = useCallback(async (query, documentContext = null, consultationType = 'general') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/ai/legal-consultation`, {
        query,
        documentContext,
        consultationType
      });

      if (response.data.success) {
        setSuccessMessage('Legal consultation completed!');
        return { success: true, consultation: response.data.consultation };
      } else {
        throw new Error(response.data.error || 'Failed to get legal consultation');
      }
    } catch (error) {
      console.error('Error getting legal consultation:', error);
      setError('Failed to get legal consultation');
      return { success: false, error: error.message };
    }
  }, []);

  // Advanced risk assessment
  const getRiskAssessment = useCallback(async (fileId, riskCategories = ['general']) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/ai/risk-assessment`, {
        fileId,
        riskCategories
      });

      if (response.data.success) {
        setSuccessMessage('Risk assessment completed!');
        return { success: true, riskAssessment: response.data.riskAssessment };
      } else {
        throw new Error(response.data.error || 'Failed to perform risk assessment');
      }
    } catch (error) {
      console.error('Error performing risk assessment:', error);
      setError('Failed to perform risk assessment');
      return { success: false, error: error.message };
    }
  }, []);

  const getFileContent = useCallback(async (fileId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/workspace/files/${fileId}`);
      
      if (response.data.success) {
        return { success: true, file: response.data.file };
      } else {
        throw new Error(response.data.error || 'Failed to get file content');
      }
    } catch (error) {
      console.error('Error getting file content:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Email functionality
  const sendEmail = useCallback(async (recipientEmail, subject, body, documentTitle = null, emailContext = 'Workspace email') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/workspace/send-email`, {
        recipientEmail,
        subject,
        body,
        documentTitle,
        emailContext
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        return { 
          success: true, 
          message: response.data.message,
          emailSent: response.data.emailSent,
          simulation: response.data.simulation,
          details: response.data.details
        };
      } else {
        throw new Error(response.data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send email';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchTodos();
    fetchFiles();
  }, [fetchTodos, fetchFiles]);

  // Clear error and success messages after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return {
    // State
    todos,
    files,
    isLoadingTodos,
    isLoadingFiles,
    error,
    successMessage,
    
    // Todo actions
    fetchTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    
    // File actions
    fetchFiles,
    uploadFile,
    deleteFile,
    getFileContent,
    
    // AI actions
    generateAITasks,
    analyzeFile,
    getLegalConsultation,
    getRiskAssessment,
    
    // Email actions
    sendEmail,
    
    // Utility
    clearError: () => setError(null),
    clearSuccessMessage: () => setSuccessMessage(null)
  };
}
