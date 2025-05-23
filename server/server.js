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

// Track connected players
const players = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add player to the players map
  players.set(socket.id, {
    id: socket.id,
    username: `Player-${socket.id.substring(0, 4)}`,
    position: { x: 0, y: 0, z: 0 },
    color: Math.random() * 0xffffff // Random color for each player
  });
  
  // Emit current player list to the new client
  socket.emit('players list', Array.from(players.values()));
  
  // Notify other clients about the new player
  socket.broadcast.emit('player joined', players.get(socket.id));
  
  // Update user count for all clients
  io.emit('user count', players.size);
  
  // Send recent chat history to newly connected client
  const recentMessages = getRecentMessages.all().reverse();
  socket.emit('chat history', recentMessages);
  
  // Handle new chat messages
  socket.on('chat message', (data) => {
    const { username, content } = data;
    
    // Save message to database
    const info = insertMessage.run(username, content);
    
    // Broadcast message to all clients with player ID
    io.emit('chat message', {
      id: info.lastInsertRowid,
      username,
      content,
      playerId: socket.id, // Include the player ID for chat bubbles
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle 3D object updates (cube rotation)
  socket.on('update rotation', (rotation) => {
    // Broadcast the rotation update to all other clients
    socket.broadcast.emit('update rotation', rotation);
  });
  
  // Handle player position updates
  socket.on('update position', (data) => {
    console.log('Received position update from client:', socket.id, data);
    
    // Update player data in the players map
    const player = players.get(socket.id);
    if (player) {
      // Update position if provided
      if (data.position) {
        player.position = data.position;
        console.log('Updated player position to:', data.position);
      }
      
      // Update rotation if provided
      if (data.rotation) {
        player.rotation = data.rotation;
        console.log('Updated player rotation to:', data.rotation);
      }
      
      // Update target position if provided
      if (data.targetPosition) {
        player.targetPosition = data.targetPosition;
        console.log('Updated player target position to:', data.targetPosition);
      }
      
      // Add playerId to the data if not already present
      if (!data.playerId) {
        data.playerId = socket.id;
      }
      
      // Broadcast the position update to all other clients
      console.log('Broadcasting player position to other clients:', data);
      socket.broadcast.emit('player position', data);
    } else {
      console.error('Player not found in players map:', socket.id);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from players map
    players.delete(socket.id);
    
    // Notify other clients about the player leaving
    socket.broadcast.emit('player left', { playerId: socket.id });
    
    // Update user count for all clients
    io.emit('user count', players.size);
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
