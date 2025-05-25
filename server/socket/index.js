// server/socket/index.js
// Socket.io event handlers

import { initChatHandlers } from './chat.js';
import { initInventoryHandlers } from './inventory.js';
import { initPlayerHandlers } from './player.js';
import { initTradeHandlers, activeTrades } from './trade.js';
import { statements } from '../db/index.js';
import { isUserLoggedIn, updateSessionActivity, activeSessions } from '../routes/auth.js';

/**
 * Initialize all socket handlers
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
export function initSocketHandlers(io, players, worldItems) {
  // Socket.io connection handling with authentication middleware
  io.use((socket, next) => {
    // Get user data from handshake
    const userData = socket.handshake.auth.userData;
    if (userData && userData.id) {
      // Check if this user is already logged in with an active session
      if (isUserLoggedIn(userData.id)) {
        // Get the active session
        const session = activeSessions.get(userData.id);
        
        // Check if this socket is associated with the active session
        // We'll use the session ID from the cookie
        const cookies = socket.handshake.headers.cookie;
        if (cookies) {
          const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
          if (sessionMatch) {
            const sessionId = decodeURIComponent(sessionMatch[1]).split('.')[0].slice(2);
            
            // If this is not the active session, reject the connection
            if (session.sessionId !== sessionId) {
              console.log(`Rejecting socket connection for user ${userData.id} - already logged in elsewhere`);
              return next(new Error('You are already logged in on another device or browser'));
            }
            
            // Update session activity
            updateSessionActivity(userData.id, sessionId);
          }
        }
      }
      
      // If we have user data, associate it with the socket
      socket.userId = userData.id;
      socket.username = userData.username;
      console.log(`Socket authenticated for user ${userData.username} (ID: ${userData.id})`);
      next();
    } else {
      // No user data, proceed as guest
      console.log('Socket connecting as guest');
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Initialize player with default values or load from database if authenticated
    let newPlayer;
    
    if (socket.userId) {
      // Authenticated user - try to load saved state from database
      try {
        const savedState = statements.getPlayerState.get(socket.userId);
        
        if (savedState) {
          // User has saved state, use it
          console.log(`Loading saved state for user ${socket.username} (ID: ${socket.userId})`);
          
          newPlayer = {
            id: socket.id,
            userId: socket.userId,
            username: socket.username,
            position: { 
              x: savedState.position_x, 
              y: savedState.position_y, 
              z: savedState.position_z 
            },
            color: savedState.color,
            inventory: Array(28).fill(null) // Will be populated from inventory table
          };
        } else {
          // Authenticated but no saved state, create new with random color
          const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
          
          newPlayer = {
            id: socket.id,
            userId: socket.userId,
            username: socket.username,
            position: { x: 0, y: 0.5, z: 0 },
            color: color,
            inventory: Array(28).fill(null)
          };
          
          // Save initial state to database
          statements.savePlayerState.run(
            socket.userId,
            newPlayer.position.x,
            newPlayer.position.y,
            newPlayer.position.z,
            newPlayer.color
          );
          console.log(`Created new state for authenticated user ${socket.username}`);
        }
      } catch (error) {
        console.error(`Error loading player state for user ${socket.userId}:`, error);
        // Fallback to default state if error occurs
        const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        
        newPlayer = {
          id: socket.id,
          userId: socket.userId,
          username: socket.username,
          position: { x: 0, y: 0.5, z: 0 },
          color: color,
          inventory: Array(28).fill(null)
        };
      }
    } else {
      // Guest user - create temporary player
      const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      
      newPlayer = {
        id: socket.id,
        username: `Guest-${socket.id.substring(0, 4)}`,
        position: { x: 0, y: 0.5, z: 0 },
        color: color,
        inventory: Array(28).fill(null),
        isGuest: true
      };
      
      console.log(`Created guest player: ${newPlayer.username}`);
    }
    
    // Add default item to player's inventory if it's empty
    if (!newPlayer.inventory[0]) {
      newPlayer.inventory[0] = {
        id: 0,
        name: 'Default Item',
        description: 'The default item that every player starts with'
      };
    }
    
    // Load player inventory from database if authenticated
    if (socket.userId) {
      try {
        const inventoryItems = statements.getPlayerInventory.all(socket.userId.toString());
        if (inventoryItems && inventoryItems.length > 0) {
          // Convert DB items to inventory array format
          inventoryItems.forEach(item => {
            if (item.slot_index < newPlayer.inventory.length) {
              newPlayer.inventory[item.slot_index] = {
                id: item.item_id,
                name: item.item_name,
                description: item.item_description
              };
            }
          });
          console.log(`Loaded ${inventoryItems.length} inventory items for user ${socket.username}`);
        }
      } catch (error) {
        console.error(`Error loading inventory for user ${socket.userId}:`, error);
      }
    }
    
    // Add player to the players map
    players.set(socket.id, newPlayer);
    
    // Emit other players list to the new client (excluding the new player)
    const otherPlayers = Array.from(players.values())
      .filter(player => player.id !== socket.id)
      .map(player => ({
        id: player.id,
        username: player.username,
        position: player.position,
        color: player.color
      }));
    
    socket.emit('players list', otherPlayers);
    
    // Emit the new player to itself through the player-joined event
    // This ensures the local player is created with isLocalPlayer = true
    socket.emit('player joined', {
      id: newPlayer.id,
      username: newPlayer.username,
      position: newPlayer.position,
      color: newPlayer.color,
      isAuthenticated: !!socket.userId
    });
    
    // Notify other clients about the new player
    socket.broadcast.emit('player joined', {
      id: newPlayer.id,
      username: newPlayer.username,
      position: newPlayer.position,
      color: newPlayer.color
    });
    
    // Explicitly send the player's inventory
    console.log(`Sending inventory to player ${socket.id}:`, newPlayer.inventory);
    socket.emit('player inventory', newPlayer.inventory);
    
    // Update user count for all clients
    io.emit('user count', players.size);
    
    // Send world items state
    const worldItemsArray = Array.from(worldItems.values());
    socket.emit('world items state', worldItemsArray);
    
    // Initialize all handlers
    initChatHandlers(socket, io);
    initInventoryHandlers(socket, io, players, worldItems);
    initPlayerHandlers(socket, io, players, worldItems);
    initTradeHandlers(socket, io, players);
  });
}

export { activeTrades };
