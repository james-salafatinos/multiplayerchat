// server/server.js
// Main server file for the multiplayer ThreeJS application

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Set up static file serving from the public directory
app.use(express.static(join(__dirname, '../public')));

// Database admin endpoints
app.get('/admin/db/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC').all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/db/stats', (req, res) => {
  try {
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const latestMessage = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 1').get();
    res.json({
      messageCount: messageCount.count,
      latestMessage,
      databasePath: join(__dirname, '../chat.db'),
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize SQLite database
const db = new Database(join(__dirname, '../chat.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepare statements
const insertMessage = db.prepare('INSERT INTO messages (username, content) VALUES (?, ?)');
const getRecentMessages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50');

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send recent chat history to newly connected client
  const recentMessages = getRecentMessages.all().reverse();
  socket.emit('chat history', recentMessages);
  
  // Handle new chat messages
  socket.on('chat message', (data) => {
    const { username, content } = data;
    
    // Save message to database
    const info = insertMessage.run(username, content);
    
    // Broadcast message to all clients
    io.emit('chat message', {
      id: info.lastInsertRowid,
      username,
      content,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle 3D object updates (cube rotation)
  socket.on('update rotation', (rotation) => {
    // Broadcast the rotation update to all other clients
    socket.broadcast.emit('update rotation', rotation);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:3000 in your browser to view the application');
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  httpServer.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
