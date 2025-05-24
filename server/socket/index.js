// server/socket/index.js
// Socket.io event handlers

import { initChatHandlers } from './chat.js';
import { initInventoryHandlers } from './inventory.js';
import { initPlayerHandlers } from './player.js';
import { initTradeHandlers, activeTrades } from './trade.js';

/**
 * Initialize all socket handlers
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
export function initSocketHandlers(io, players, worldItems) {
  // Socket.io connection handling with authentication middleware
  io.use((socket, next) => {
    // Get session from handshake
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      // If we have a sessionID, use it to restore the session
      // This would require more complex session handling with the session store
      // For now, we'll just pass through and handle authentication in the connection event
      next();
    } else {
      // No session ID, proceed as guest
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Initialize player with default values
    const newPlayer = {
      id: socket.id,
      username: `Player-${socket.id.substring(0, 4)}`,
      position: { x: 0, y: 0, z: 0 },
      color: Math.random() * 0xffffff, // Random color for each player
      inventory: Array(28).fill(null) // Initialize empty inventory with 28 slots
    };
    
    // Add default item to player's inventory
    newPlayer.inventory[0] = {
      id: 0,
      name: 'Default Item',
      description: 'The default item that every player starts with'
    };
    
    // Add player to the players map
    players.set(socket.id, newPlayer);
    
    // Emit other players list to the new client (excluding the new player)
    const otherPlayers = Array.from(players.values()).filter(player => player.id !== socket.id);
    socket.emit('players list', otherPlayers);
    
    // Emit the new player to itself through the player-joined event
    // This ensures the local player is created with isLocalPlayer = true
    socket.emit('player joined', newPlayer);
    
    // Notify other clients about the new player
    // Using socket.broadcast.emit ensures this only goes to other clients, not the sender
    socket.broadcast.emit('player joined', newPlayer);
    
    // Explicitly send the player's initial inventory
    console.log(`Sending initial inventory to player ${socket.id}:`, newPlayer.inventory);
    socket.emit('player inventory', newPlayer.inventory);
    
    // Update user count for all clients
    io.emit('user count', players.size);
    
    // Send world items state
    const worldItemsArray = Array.from(worldItems.values());
    console.log(`Sending world items state to ${socket.id}:`, JSON.stringify(worldItemsArray));
    socket.emit('world items state', worldItemsArray);
    
    // Initialize all handlers
    initChatHandlers(socket, io);
    initInventoryHandlers(socket, io, players, worldItems);
    initPlayerHandlers(socket, io, players, worldItems);
    initTradeHandlers(socket, io, players);
  });
}

export { activeTrades };
