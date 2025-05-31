// server/socket/index.js
// Socket.io event handlers

import { initChatHandlers } from './chat.js';
import { initInventoryHandlers } from './inventory.js';
import { initPlayerHandlers } from './player.js';
import { initTradeHandlers, activeTrades } from './trade.js';
import { initAdminHandlers } from './admin.js';
import setupSkillsHandlers from './skills.js';
import { statements } from '../db/index.js';
import { getItemById } from '../utils/itemManager.js';
import { isUserLoggedIn, updateSessionActivity, activeSessions } from '../routes/auth.js';

// Track active socket connections per user ID
const activeUserSockets = new Map();

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
    
    // If this is an authenticated user, check if they already have an active socket
    if (socket.userId) {
      // Check if this user already has an active socket connection
      if (activeUserSockets.has(socket.userId)) {
        const existingSocket = activeUserSockets.get(socket.userId);
        
        // If the existing socket is still connected, disconnect this new one
        if (io.sockets.sockets.has(existingSocket)) {
          console.log(`User ${socket.userId} already has an active socket connection. Disconnecting new connection.`);
          socket.emit('connection_error', { 
            message: 'You are already connected in another tab or window. Please use that session instead.'
          });
          socket.disconnect(true);
          return;
        } else {
          // The existing socket is no longer valid, remove it
          console.log(`Removing stale socket connection for user ${socket.userId}`);
          activeUserSockets.delete(socket.userId);
        }
      }
      
      // Store this socket as the active one for this user
      activeUserSockets.set(socket.userId, socket.id);
      console.log(`Set socket ${socket.id} as active for user ${socket.userId}`);
    }
    
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
          
          // Load player inventory from database
          try {
            // Make sure we're using the userId for database queries
            const inventoryItems = statements.getPlayerInventory.all(socket.userId);
            console.log(`Loading ${inventoryItems.length} inventory items for user ${socket.username} (ID: ${socket.userId})`);
            
            // Populate inventory slots with items from database
            inventoryItems.forEach(item => {
              // Get item definition from itemManager for additional properties
              const itemDef = getItemById(item.item_id);
              
              newPlayer.inventory[item.slot_index] = {
                id: item.item_id,
                name: item.item_name,
                description: item.item_description,
                quantity: item.quantity || 1,
                // Include additional properties from item definition
                inventoryIconPath: itemDef ? itemDef.inventoryIconPath : null,
                gltfPath: itemDef ? itemDef.gltfPath : null,
                tradeable: itemDef ? itemDef.tradeable : true,
                stackable: itemDef ? itemDef.stackable : false,
                maxStack: itemDef ? itemDef.maxStack : 1,
                type: itemDef ? itemDef.type : 'generic'
              };
            });
          } catch (error) {
            console.error(`Error loading inventory for user ${socket.userId}:`, error);
          }
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
    
    // Only add default item for truly new players
    // For guests: only if they don't have any items yet
    // For registered users: only if they've never connected before (check a special flag in the database)
    
    // First, load inventory from database if authenticated
    let hasConnectedBefore = false;
    if (socket.userId) {
      try {
        // Check if player has connected before (look for a record in player_state)
        const playerState = statements.getPlayerState.get(socket.userId.toString());
        hasConnectedBefore = !!playerState;
        
        // Load inventory items
        const inventoryItems = statements.getPlayerInventory.all(socket.userId.toString());
        if (inventoryItems && inventoryItems.length > 0) {
          // Convert DB items to inventory array format
          inventoryItems.forEach(item => {
            if (item.slot_index < newPlayer.inventory.length) {
              // Get item definition from itemManager for additional properties
              const itemDef = getItemById(item.item_id);
              
              newPlayer.inventory[item.slot_index] = {
                id: item.item_id,
                name: item.item_name,
                description: item.item_description,
                quantity: item.quantity || 1,
                // Include additional properties from item definition
                inventoryIconPath: itemDef ? itemDef.inventoryIconPath : null,
                gltfPath: itemDef ? itemDef.gltfPath : null,
                tradeable: itemDef ? itemDef.tradeable : true,
                stackable: itemDef ? itemDef.stackable : false,
                maxStack: itemDef ? itemDef.maxStack : 1,
                type: itemDef ? itemDef.type : 'generic'
              };
            }
          });
          console.log(`Loaded ${inventoryItems.length} inventory items for user ${socket.username}`);
        }
      } catch (error) {
        console.error(`Error loading inventory for user ${socket.userId}:`, error);
      }
    }
    
    // Now determine if we should add a default item
    const isFirstTimePlayer = newPlayer.isGuest ? !newPlayer.inventory.some(item => item !== null) : !hasConnectedBefore;
    
    if (isFirstTimePlayer) {
      console.log(`Adding default item to first-time player: ${newPlayer.username}`);
      
      // Get the default starter item from itemManager
      const defaultItem = getItemById('0'); // Updated to match the ID in items.json
      
      if (defaultItem) {
        newPlayer.inventory[0] = {
          id: defaultItem.id,
          name: defaultItem.name,
          description: defaultItem.description,
          quantity: 1,
          inventoryIconPath: defaultItem.inventoryIconPath,
          gltfPath: defaultItem.gltfPath,
          tradeable: defaultItem.tradeable,
          stackable: defaultItem.stackable,
          maxStack: defaultItem.maxStack,
          type: defaultItem.type
        };
        
        // Save to database if authenticated
        if (socket.userId) {
          statements.setInventoryItem.run(
            socket.userId,
            0, // slot index
            defaultItem.id,
            defaultItem.name,
            defaultItem.description,
            1 // quantity
          );
        }
      } else {
        console.error('Default starter item not found in item definitions');
      }
    }
    
    // Inventory is already loaded above for authenticated users
    
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
    
    // Make sure all items in inventory have their full definitions
    for (let i = 0; i < newPlayer.inventory.length; i++) {
      const item = newPlayer.inventory[i];
      if (item && item.id) {
        // Get the full item definition from itemManager
        const itemDef = getItemById(item.id);
        if (itemDef) {
          // Update the item with all properties from the definition
          newPlayer.inventory[i] = {
            ...item,
            inventoryIconPath: itemDef.inventoryIconPath,
            gltfPath: itemDef.gltfPath,
            tradeable: itemDef.tradeable,
            stackable: itemDef.stackable,
            maxStack: itemDef.maxStack,
            type: itemDef.type
          };
        }
      }
    }
    
    // Explicitly send the player's inventory
    console.log(`Sending inventory to player ${socket.id}:`, newPlayer.inventory);
    socket.emit('player inventory', newPlayer.inventory);
    
    // Update user count for all clients
    io.emit('user count', players.size);
    
    // Send world items state
    const worldItemsArray = Array.from(worldItems.values());
    socket.emit('world items state', worldItemsArray);
    
    // Initialize socket handlers
    initChatHandlers(socket, io, players);
    initInventoryHandlers(socket, io, players, worldItems);
    initPlayerHandlers(socket, io, players, worldItems);
    initTradeHandlers(socket, io, players, activeTrades);
    initAdminHandlers(socket, io, players, worldItems);
    
    // Initialize skills handlers if user is authenticated
    if (socket.userId) {
      const userData = { userId: socket.userId, username: socket.username };  // Changed id to userId
      setupSkillsHandlers(io, socket, players, userData);
    }
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      if (socket.userId) {
        // Only remove if this is the current active socket for this user
        if (activeUserSockets.get(socket.userId) === socket.id) {
          console.log(`Removing active socket for user ${socket.userId}`);
          activeUserSockets.delete(socket.userId);
          
          // Force session cleanup from activeSessions map to prevent "already logged in" issues
          if (activeSessions.has(socket.userId)) {
            console.log(`Forcibly cleaning up session for user ${socket.userId} on disconnect`);
            activeSessions.delete(socket.userId);
          }
        }
        
        // Save player state to database before removing
        const player = players.get(socket.id);
        if (player) {
          console.log(`Saving final state for user ${socket.userId} before disconnect.`);
          
          // Save position and color
          statements.savePlayerState.run(
            socket.userId,
            player.position.x,
            player.position.y,
            player.position.z,
            player.color
          );
          
          // Save inventory items
          try {
            // First clear existing inventory records for this user
            statements.clearPlayerInventory.run(socket.userId);
            
            // Then save current inventory state
            player.inventory.forEach((item, slotIndex) => {
              if (item !== null) {
                statements.setInventoryItem.run(
                  socket.userId,
                  slotIndex,
                  item.id,
                  item.name,
                  item.description || '',
                  item.quantity || 1
                );
              }
            });
            
            console.log(`Saved inventory with ${player.inventory.filter(item => item !== null).length} items for user ${socket.userId}`);
          } catch (error) {
            console.error(`Error saving inventory for user ${socket.userId}:`, error);
          }
        }
      }
      
      // Remove player from players map
      players.delete(socket.id);
      
      // Notify other clients
      socket.broadcast.emit('player left', socket.id);
      
      // Update user count for all clients
      io.emit('user count', players.size);
    });
  });
}

export { activeTrades };
