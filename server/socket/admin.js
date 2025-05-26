// server/socket/admin.js
// Admin socket handlers for item spawning and management

import { v4 as uuidv4 } from 'uuid';
import { addWorldItem, removeWorldItem } from '../utils/worldItems.js';
import { getItemById, getAllItems } from '../utils/itemManager.js';

/**
 * Initialize admin handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
export function initAdminHandlers(socket, io, players, worldItems) {
  // Check if user has admin privileges
  const isAdmin = () => {
    return socket.userId && (socket.isAdmin === true);
  };

  // Handle admin authentication
  socket.on('admin:auth', (data) => {
    // In a real application, you would verify admin credentials here
    // For now, we'll use a simple password check
    if (data.password === 'admin123') {
      socket.isAdmin = true;
      socket.emit('admin:auth:response', { 
        success: true, 
        message: 'Admin authentication successful' 
      });
    } else {
      socket.isAdmin = false;
      socket.emit('admin:auth:response', { 
        success: false, 
        message: 'Admin authentication failed' 
      });
    }
  });

  // Get all available items for spawning
  socket.on('admin:getItems', () => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    const items = getAllItems();
    socket.emit('admin:itemsList', items);
  });

  // Spawn an item in the world
  socket.on('admin:spawnItem', (data) => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    try {
      const { itemId, position } = data;
      
      // Get item definition
      const itemDef = getItemById(itemId);
      if (!itemDef) {
        socket.emit('admin:error', { message: `Item with ID ${itemId} not found` });
        return;
      }

      // Generate a unique UUID for the item
      const itemUuid = `item-${uuidv4()}`;
      
      // Create the world item
      const worldItem = {
        uuid: itemUuid,
        id: itemDef.id,
        name: itemDef.name,
        description: itemDef.description || '',
        position: position || { x: 0, y: 0.15, z: 0 }, // Default position if none provided
        gltfPath: itemDef.gltfPath // Include the gltfPath
      };
      
      // Add to world items map and database
      const success = addWorldItem(worldItems, worldItem);
      
      if (success) {
        // Notify all clients about the new item
        io.emit('world-item-added', worldItem);
        
        socket.emit('admin:spawnItem:response', { 
          success: true, 
          message: `Item ${itemDef.name} spawned successfully`,
          item: worldItem
        });
      } else {
        socket.emit('admin:error', { message: 'Failed to add item to world' });
      }
    } catch (error) {
      console.error('Error spawning item:', error);
      socket.emit('admin:error', { message: `Error spawning item: ${error.message}` });
    }
  });

  // Get all world items
  socket.on('admin:getWorldItems', () => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    const items = Array.from(worldItems.values());
    socket.emit('admin:worldItemsList', items);
  });

  // Remove a world item
  socket.on('admin:removeWorldItem', (data) => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    try {
      const { itemUuid } = data;
      
      if (!worldItems.has(itemUuid)) {
        socket.emit('admin:error', { message: `Item with UUID ${itemUuid} not found` });
        return;
      }
      
      // Get the item before removing it
      const item = worldItems.get(itemUuid);
      
      // Remove from world items map and database
      const success = removeWorldItem(worldItems, itemUuid);
      
      if (success) {
        // Notify all clients about the removed item
        io.emit('item-removed', itemUuid);
        
        socket.emit('admin:removeWorldItem:response', { 
          success: true, 
          message: `Item ${item.name} removed successfully`,
          itemUuid
        });
      } else {
        socket.emit('admin:error', { message: 'Failed to remove item from world' });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      socket.emit('admin:error', { message: `Error removing item: ${error.message}` });
    }
  });
}
