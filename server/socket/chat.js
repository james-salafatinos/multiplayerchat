// server/socket/chat.js
// Chat functionality for socket.io

import { statements } from '../db/index.js';

/**
 * Initialize chat handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 */
export function initChatHandlers(socket, io) {
  // Send recent chat history to newly connected client
  const recentMessages = statements.getRecentMessages.all().reverse();
  socket.emit('chat history', recentMessages);
  
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
}
