// server/socket/player.js
// Player management for socket.io

import { statements } from '../db/index.js';

// Event name constants for better code organization
const EVENTS = {
  AUTHENTICATE: 'authenticate',
  UPDATE_POSITION: 'update position',
  UPDATE_ROTATION: 'update rotation',
  PLAYER_JOINED: 'player joined',
  PLAYER_UPDATED: 'player updated',
  PLAYER_LEFT: 'player left',
  PLAYER_POSITION: 'player position',
  PLAYER_INVENTORY: 'player inventory',
  PLAYERS_LIST: 'players list',
  WORLD_ITEMS_STATE: 'world items state',
  USER_COUNT: 'user count',
  PLAYER_UPDATE_COLOR: 'player:updateColor', // Client emits this
  PLAYER_COLOR_CHANGED: 'player:colorChanged' // Server broadcasts this
};

/**
 * Initialize player handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
export function initPlayerHandlers(socket, io, players, worldItems) {
  // Handle authentication
  socket.on('authenticate', (userData) => {
    const { username, userId } = userData;
    console.log(`User ${username} (ID: ${userId}) authenticated with socket ${socket.id}`);
    
    // Associate user data with socket
    socket.username = username;
    socket.userId = userId;
    
    // Get the existing player or create a new one
    const existingPlayer = players.get(socket.id);
    
    if (existingPlayer) {
      // Update existing player with authenticated info
      existingPlayer.username = username;
      existingPlayer.userId = userId;
      existingPlayer.isGuest = false;
      
      // Try to load saved state from database
      try {
        const savedState = statements.getPlayerState.get(userId);
        if (savedState) {
          // Update position and color from saved state
          existingPlayer.position = {
            x: savedState.position_x,
            y: savedState.position_y,
            z: savedState.position_z
          };
          existingPlayer.color = savedState.color;
          
          console.log(`Loaded saved state for user ${username} (ID: ${userId})`);
        } else {
          // No saved state, save current state to database
          statements.savePlayerState.run(
            userId,
            existingPlayer.position.x,
            existingPlayer.position.y,
            existingPlayer.position.z,
            existingPlayer.color
          );
          console.log(`Created new state for authenticated user ${username}`);
        }
        
        // Load player inventory from database
        const inventoryItems = statements.getPlayerInventory.all(userId.toString());
        if (inventoryItems && inventoryItems.length > 0) {
          // Convert DB items to inventory array format
          inventoryItems.forEach(item => {
            if (item.slot_index < existingPlayer.inventory.length) {
              existingPlayer.inventory[item.slot_index] = {
                id: item.item_id,
                name: item.item_name,
                description: item.item_description
              };
            }
          });
          console.log(`Loaded ${inventoryItems.length} inventory items for user ${username}`);
        }
      } catch (error) {
        console.error(`Error loading state for user ${userId}:`, error);
      }
      
      // Notify other clients about the updated player
      socket.broadcast.emit('player updated', {
        id: socket.id,
        username: username,
        position: existingPlayer.position,
        color: existingPlayer.color
      });
      
      // Send updated inventory to the player
      socket.emit('player inventory', existingPlayer.inventory);
    } else {
      // This shouldn't normally happen as the player should be created on connection
      // But handle it just in case
      console.log(`Creating new player for authenticated user ${username}`);
      
      // Try to load saved state from database
      try {
        const savedState = statements.getPlayerState.get(userId);
        let position = { x: 0, y: 0.5, z: 0 };
        let color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        
        if (savedState) {
          position = {
            x: savedState.position_x,
            y: savedState.position_y,
            z: savedState.position_z
          };
          color = savedState.color;
        }
        
        // Create new player with authenticated info
        const newPlayer = {
          username: username,
          userId: userId,
          position: position,
          color: color,
          inventory: Array(28).fill(null),
          isGuest: false
        };
        
        players.set(socket.id, newPlayer);
        
        // If no saved state, save initial state
        if (!savedState) {
          statements.savePlayerState.run(
            userId,
            position.x,
            position.y,
            position.z,
            color
          );
        }
        
        // Load player inventory from database
        const inventoryItems = statements.getPlayerInventory.all(userId.toString());
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
        }
        
        // Notify other clients about the new player
        socket.broadcast.emit('player joined', {
          id: socket.id,
          username: username,
          position: position,
          color: color
        });
        
        // Send the current players list to the new player
        const playersList = Array.from(players.entries())
          .filter(([id, _]) => id !== socket.id)
          .map(([id, player]) => ({
            id,
            username: player.username,
            position: player.position,
            color: player.color
          }));
          
        socket.emit('players list', playersList);
        
        // Send the player's inventory
        socket.emit('player inventory', newPlayer.inventory);
        
        // Send world items state
        const worldItemsArray = Array.from(worldItems.values());
        socket.emit('world items state', worldItemsArray);
      } catch (error) {
        console.error(`Error setting up authenticated player ${userId}:`, error);
      }
    }
    
    // Update user count for all clients
    io.emit('user count', players.size);
  });

  // Handle player position updates
  socket.on(EVENTS.UPDATE_POSITION, (data) => {
    console.log('Position update received:', data);
    
    try {
      // Update player's position in memory
      const player = players.get(socket.id);
      if (player) {
        // Store current position for interpolation calculations
        const currentPosition = { ...player.position };
        
        // Check if data contains targetPosition
        if (data.targetPosition) {
          // If target position is provided, update player's target position
          // and keep track of it for broadcasting
          player.targetPosition = {
            x: data.targetPosition.x,
            y: data.targetPosition.y,
            z: data.targetPosition.z
          };
          
          // Also update current position if not already set
          if (!player.position) {
            player.position = { ...player.targetPosition };
          }
        }
        
        // If position is directly provided, update it
        if (data.position) {
          player.position = {
            x: data.position.x,
            y: data.position.y,
            z: data.position.z
          };
        }
        
        // Update rotation if provided
        if (data.rotation) {
          player.rotation = data.rotation;
        }
        
        // Broadcast the position update to other clients
        // Include both current position and target position for smooth interpolation
        socket.broadcast.emit('player position', {
          playerId: socket.id,
          position: player.position,
          targetPosition: player.targetPosition || player.position, // Use position as fallback
          rotation: player.rotation
        });
        
        // If player is authenticated, periodically update their position in the database
        // We don't want to update on every movement to avoid excessive database writes
        // Using a debounce approach with a timestamp check
        const currentTime = Date.now();
        if (socket.userId && (!player.lastPositionSave || currentTime - player.lastPositionSave > 5000)) {
          // Only save position every 5 seconds to reduce database load but ensure data is fresh
          try {
            // Initialize rotation values if they don't exist
            if (!player.rotation) {
              player.rotation = { x: 0, y: 0, z: 0 };
            }
            
            statements.savePlayerState.run(
              socket.userId,
              player.position.x,
              player.position.y,
              player.position.z,
              player.rotation.x || 0,
              player.rotation.y || 0,
              player.rotation.z || 0,
              player.color
            );
            player.lastPositionSave = currentTime;
            console.log(`Updated position and rotation in database for user ${socket.userId}`);
          } catch (error) {
            console.error(`Error saving position/rotation for user ${socket.userId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling position update:', error);
    }
  });

  // Handle player color update
  socket.on(EVENTS.PLAYER_UPDATE_COLOR, (data) => {
    console.log(`Color update received from ${socket.id}:`, data);
    const player = players.get(socket.id);

    if (player && player.userId && data && typeof data.color === 'string') {
      // Basic validation for hex color format (e.g., #RRGGBB)
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColorRegex.test(data.color)) {
        console.error(`Invalid color format received from ${socket.id}: ${data.color}`);
        // Optionally, send an error back to the client
        // socket.emit('player:updateColorError', { message: 'Invalid color format.' });
        return;
      }

      try {
        // Update color in database
        statements.updatePlayerColor.run(data.color, player.userId);
        
        // Update color in server memory
        player.color = data.color;
        console.log(`Player ${player.username} (ID: ${player.userId}, Socket: ${socket.id}) color updated to ${data.color}`);

        // Broadcast the color change to other clients
        socket.broadcast.emit(EVENTS.PLAYER_COLOR_CHANGED, {
          id: socket.id, // Client-side app.js expects 'id' for player identifier
          color: data.color
        });
      } catch (error) {
        console.error(`Error updating color for player ${player.userId}:`, error);
        // Optionally, send an error back to the client
        // socket.emit('player:updateColorError', { message: 'Failed to update color on server.' });
      }
    } else {
      console.warn(`Could not update color for socket ${socket.id}. Player or data missing/invalid.`);
    }
  });

  // Handle 3D object updates (cube rotation)
  socket.on(EVENTS.UPDATE_ROTATION, (data) => {
    // Broadcast the rotation update to all other clients
    socket.broadcast.emit('update rotation', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Save final state for authenticated users before removing from memory
    const player = players.get(socket.id);
    if (player && socket.userId) {
      try {
        // Save final position and state to database
        statements.savePlayerState.run(
          socket.userId,
          player.position.x,
          player.position.y,
          player.position.z,
          player.color
        );
        console.log(`Saved final state for user ${socket.userId} before disconnect`);
      } catch (error) {
        console.error(`Error saving final state for user ${socket.userId}:`, error);
      }
    }
    
    // Remove player from players map
    players.delete(socket.id);
    
    // Notify other clients about the player leaving
    socket.broadcast.emit('player left', { playerId: socket.id });
    
    // Update user count for all clients
    io.emit('user count', players.size);
  });
}
