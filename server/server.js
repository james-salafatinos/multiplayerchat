// server/server.js
// Main server file for the multiplayer ThreeJS application

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import dotenv from 'dotenv';

// Import modules
import config from './config/index.js';
import { db } from './db/index.js';
import createRouter from './routes/index.js';
import { initSocketHandlers, activeTrades } from './socket/index.js';
import { initDebugHandlers } from './socket/debug.js';
import { initializeWorldItems } from './utils/worldItems.js';

// Load environment variables
dotenv.config();

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Make io available to routes
app.set('io', io);

// Set up middleware
app.use(express.static(join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session middleware
const SQLiteStore = SQLiteStoreFactory(session);
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie
}));

// Track connected players and world items
const players = new Map();

// Route for debug page
app.get('/debug', (req, res) => {
  res.sendFile(join(__dirname, '../public/debug.html'));
});

// Initialize world items
const worldItems = initializeWorldItems();

// Create and mount API routes with players and worldItems access
const router = createRouter(players, worldItems);
app.use('/api', router);

// Initialize socket handlers
initSocketHandlers(io, players, worldItems);

// Initialize debug socket handlers
initDebugHandlers(io, players, worldItems);

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:3000 in your browser to view the application');
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
    
    // Close the HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      
      // Close the database connection
      if (db) {
        try {
          db.close();
          console.log('Database connection closed');
        } catch (err) {
          console.error('Error closing database:', err);
        }
      }
      
      console.log('Server shut down successfully');
      // Force exit after a timeout in case something is still hanging
      setTimeout(() => {
        console.log('Forcing process exit');
        process.exit(0);
      }, 1000);
    });
  });
});
