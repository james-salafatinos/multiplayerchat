// server/socket/chat.js
// Chat functionality for socket.io

import { statements } from '../db/index.js';

// Store recent game actions in memory (could be moved to database in production)
let gameActionHistory = [];
const MAX_GAME_ACTION_HISTORY = 50; // Keep only recent actions

/**
 * Initialize chat handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 */
export function initChatHandlers(socket, io) {
  // Send recent chat history to newly connected client
  const recentMessages = statements.getRecentMessages.all().reverse();
  socket.emit('chat history', recentMessages);
  
  // Send recent game action history
  socket.emit('game action history', gameActionHistory);
  
  // Handle chat messages
  socket.on('chat message', (data) => {
    const { username, content } = data;
    
    // Save message to database
    const info = statements.insertMessage.run(username, content);
    
    // Broadcast message to all clients with player ID
    io.emit('chat message', {
      id: info.lastInsertRowid,
      username,
      content,
      playerId: socket.id, // Include the player ID for chat bubbles
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle logging game actions
  socket.on('log game action', (actionData) => {
    const { actionType, content, playerId, playerName } = actionData;
    
    const gameAction = {
      actionType,
      content,
      playerId: playerId || socket.id,
      playerName,
      timestamp: new Date().toISOString()
    };
    
    // Add to game action history
    gameActionHistory.push(gameAction);
    
    // Limit history size
    if (gameActionHistory.length > MAX_GAME_ACTION_HISTORY) {
      gameActionHistory = gameActionHistory.slice(-MAX_GAME_ACTION_HISTORY);
    }
    
    // Broadcast action to all clients
    io.emit('game action', gameAction);
  });
}

/**
 * Log a game action (can be called from other server modules)
 * @param {Object} io - The socket.io server instance
 * @param {Object} actionData - The game action data
 */
export function logGameAction(io, actionData) {
  const { actionType, content, playerId, playerName } = actionData;
  
  const gameAction = {
    actionType,
    content,
    playerId,
    playerName,
    timestamp: new Date().toISOString()
  };
  
  // Add to game action history
  gameActionHistory.push(gameAction);
  
  // Limit history size
  if (gameActionHistory.length > MAX_GAME_ACTION_HISTORY) {
    gameActionHistory = gameActionHistory.slice(-MAX_GAME_ACTION_HISTORY);
  }
  
  // Broadcast action to all clients
  io.emit('game action', gameAction);
}
