/**
 * Shared workspace storage and helper functions
 * This ensures consistent data between different routes
 */

// Shared in-memory storage for development (replace with actual database in production)
export let todos = [];
export let files = [];
export let todoIdCounter = 1;
export let fileIdCounter = 1;

/**
 * Create a todo directly in shared storage
 */
export async function createTodoDirectly({ taskDescription, emailAddress = 'default@example.com', emailContext = 'User created task', documentTitle = 'General Task', dueDate = null }) {
  try {
    // Create new todo
    const newTodo = {
      id: todoIdCounter++,
      task: taskDescription,
      completed: false,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      emailAddress: emailAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      emailContext,
      documentTitle
    };

    // Add to shared storage
    todos.push(newTodo);
    
    console.log('Todo created in shared storage:', newTodo);
    return newTodo;
  } catch (error) {
    console.error('Error creating todo in shared storage:', error);
    return null;
  }
}

/**
 * Get all todos for a user
 */
export function getTodos(emailAddress = 'default@example.com') {
  return todos.filter(todo => todo.emailAddress === emailAddress);
}

/**
 * Update a todo
 */
export function updateTodo(id, updates) {
  const todoIndex = todos.findIndex(todo => todo.id === parseInt(id));
  if (todoIndex === -1) {
    return null;
  }

  todos[todoIndex] = {
    ...todos[todoIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return todos[todoIndex];
}

/**
 * Delete a todo
 */
export function deleteTodo(id) {
  const todoIndex = todos.findIndex(todo => todo.id === parseInt(id));
  if (todoIndex === -1) {
    return false;
  }

  todos.splice(todoIndex, 1);
  return true;
}

/**
 * Create a file directly in shared storage
 */
export async function createFileDirectly({ documentName, documentContent, documentType = 'legal_document', analysisResults = 'No analysis performed' }) {
  try {
    // Calculate file size
    let contentSize = 0;
    if (typeof documentContent === 'string') {
      // If it's base64, calculate the actual file size
      if (documentContent.startsWith('data:')) {
        const base64Data = documentContent.split(',')[1];
        contentSize = Math.floor(base64Data.length * 0.75); // Base64 to bytes conversion
      } else {
        contentSize = Buffer.byteLength(documentContent, 'utf8');
      }
    }

    // Create new file record
    const newFile = {
      id: fileIdCounter++,
      name: documentName,
      type: documentName.split('.').pop().toLowerCase(),
      size: contentSize > 1024 * 1024 
        ? `${(contentSize / 1024 / 1024).toFixed(1)} MB`
        : `${(contentSize / 1024).toFixed(1)} KB`,
      sizeBytes: contentSize,
      date: new Date().toISOString().split('T')[0],
      documentType: documentType,
      status: 'active',
      createdAt: new Date().toISOString(),
      analysisResults,
      content: documentContent // Store content in memory (in production, use proper storage)
    };

    // Add to shared storage
    files.push(newFile);
    
    console.log('File created in shared storage:', { name: newFile.name, id: newFile.id });
    return newFile;
  } catch (error) {
    console.error('Error creating file in shared storage:', error);
    return null;
  }
}

/**
 * Get all files
 */
export function getFiles(documentType = null) {
  if (documentType) {
    return files.filter(file => file.documentType === documentType);
  }
  return files;
}

/**
 * Get a specific file by ID
 */
export function getFileById(id) {
  return files.find(f => f.id === parseInt(id));
}

/**
 * Delete a file
 */
export function deleteFile(id) {
  const fileIndex = files.findIndex(f => f.id === parseInt(id));
  if (fileIndex === -1) {
    return false;
  }

  files.splice(fileIndex, 1);
  return true;
}
