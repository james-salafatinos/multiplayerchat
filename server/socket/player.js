// server/socket/player.js
// Player management for socket.io

import { statements } from '../db/index.js';

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
    const { username } = userData;
    console.log(`User ${username} authenticated with socket ${socket.id}`);
    
    // Associate username with socket
    socket.username = username;
    
    // Create or update player with authenticated username
    if (!players.has(socket.id)) {
      // Generate random color for player
      const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      
      // Create new player with authenticated username
      players.set(socket.id, {
        username: username,
        position: { x: 0, y: 0.5, z: 0 },
        color: color,
        inventory: Array(20).fill(null) // Initialize with 20 empty slots
      });
      
      // Load player inventory from database
      try {
        const inventoryItems = statements.getPlayerInventory.all(socket.id);
        if (inventoryItems && inventoryItems.length > 0) {
          // Convert DB items to inventory array format
          inventoryItems.forEach(item => {
            players.get(socket.id).inventory[item.slot_index] = {
              id: item.item_id,
              name: item.item_name,
              description: item.item_description
            };
          });
        }
      } catch (error) {
        console.error(`Error loading inventory for player ${socket.id}:`, error);
      }
      
      // Notify other clients about the new player
      socket.broadcast.emit('player joined', {
        id: socket.id,
        username: username,
        position: players.get(socket.id).position,
        color: players.get(socket.id).color
      });
      
      // Send the current players list to the new player
      const playersList = Array.from(players.entries()).map(([id, player]) => ({
        id,
        username: player.username,
        position: player.position,
        color: player.color
      }));
      socket.emit('players list', playersList);
      
      // Send the player's inventory
      socket.emit('player inventory', players.get(socket.id).inventory);
      
      // Send world items state
      const worldItemsArray = Array.from(worldItems.values());
      socket.emit('world items state', worldItemsArray);
      
      // Update user count for all clients
      io.emit('user count', players.size);
    }
  });

  // Handle player position updates
  socket.on('update position', (data) => {
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
        if (socket.userId && (!player.lastPositionSave || currentTime - player.lastPositionSave > 10000)) {
          // Only save position every 10 seconds to reduce database load
          try {
            statements.savePlayerState.run(
              socket.userId,
              player.position.x,
              player.position.y,
              player.position.z,
              player.color
            );
            player.lastPositionSave = currentTime;
            console.log(`Updated position in database for user ${socket.userId}`);
          } catch (error) {
            console.error(`Error saving position for user ${socket.userId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling position update:', error);
    }
  });

  // Handle 3D object updates (cube rotation)
  socket.on('update rotation', (rotation) => {
    // Broadcast the rotation update to all other clients
    socket.broadcast.emit('update rotation', rotation);
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
    
    // Note: We don't delete inventory data on disconnect to persist it for when the player returns
  });
}
