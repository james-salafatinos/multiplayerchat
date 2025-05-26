// server/socket/inventory.js
// Inventory management for socket.io

import { statements } from '../db/index.js';
import { getItemById } from '../utils/itemManager.js';

/**
 * Initialize inventory handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
export function initInventoryHandlers(socket, io, players, worldItems) {
  // Handle explicit inventory data request
  socket.on('request inventory', (data) => {
    console.log(`Received inventory request from player ${socket.id}`, data);
    const player = players.get(socket.id);
    if (player && player.inventory) {
      console.log(`Sending inventory data to player ${socket.id}:`, player.inventory);
      socket.emit('player inventory', player.inventory);
    } else {
      console.warn(`Inventory request received but player ${socket.id} not found or has no inventory`);
    }
  });

  // Handle inventory updates
  socket.on('inventory update', (data) => {
    console.log('Inventory update received:', data);
    
    try {
      // Update player's inventory in memory
      const player = players.get(socket.id);
      if (player && player.inventory) {
        switch (data.action) {
          case 'pickup':
            handlePickup(socket, io, player, data, worldItems);
            break;
            
          case 'drop':
            handleDrop(socket, io, player, data, worldItems);
            break;
            
          case 'move':
            handleMove(socket, io, player, data);
            break;
            
          case 'stack':
            handleStack(socket, io, player, data);
            break;
            
          case 'split':
            handleSplit(socket, io, player, data);
            break;
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      
      // Send error to client
      socket.emit('inventory error', {
        action: data.action,
        error: 'Server error processing inventory update'
      });
    }
  });
}

/**
 * Handle item pickup
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Object} player - The player object
 * @param {Object} data - The pickup data
 * @param {Map} worldItems - The map of world items
 */
function handlePickup(socket, io, player, data, worldItems) {
  // Check if item still exists in the world (another player might have picked it up already)
  if (data.itemUuid && !worldItems.has(data.itemUuid)) {
    console.log(`Item ${data.itemUuid} no longer exists in the world`);
    socket.emit('pickup failure', { message: 'Item no longer available.' });
    return;
  }

  // Find an empty slot in player's inventory
  const emptySlotIndex = player.inventory.findIndex(slot => slot === null);
  
  if (emptySlotIndex === -1) {
    console.log('Inventory full, cannot pick up item');
    socket.emit('pickup failure', { message: 'Inventory is full.' });
    return;
  }
  
  // Get item details from worldItems
  const itemToPickup = worldItems.get(data.itemUuid);
  if (!itemToPickup) {
    console.error(`Item ${data.itemUuid} not found in worldItems map during pickup attempt.`);
    socket.emit('pickup failure', { message: 'Item not found.' });
    return;
  }

  // Get item definition from itemManager
  const itemDef = getItemById(itemToPickup.id);
  
  // Check if this item is stackable
  const isStackable = itemDef && itemDef.stackable;
  
  // If stackable, check if player already has this item type in inventory
  let existingSlotIndex = -1;
  if (isStackable) {
    existingSlotIndex = player.inventory.findIndex(slot => 
      slot !== null && slot.id === itemToPickup.id && slot.quantity < (itemDef.maxStack || 64)
    );
  }
  
  if (existingSlotIndex !== -1) {
    // Add to existing stack
    player.inventory[existingSlotIndex].quantity += 1;
    
    // Update quantity in database
    statements.updateInventoryItemQuantity.run(
      player.inventory[existingSlotIndex].quantity,
      socket.userId || socket.id,
      existingSlotIndex
    );
  } else {
    // Add item to player's inventory (memory)
    player.inventory[emptySlotIndex] = {
      uuid: itemToPickup.uuid, // Store UUID for potential future drop identification
      id: itemToPickup.id,
      name: itemToPickup.name,
      description: itemToPickup.description,
      quantity: 1,
      // Include additional properties from item definition
      inventoryIconPath: itemDef ? itemDef.inventoryIconPath : null,
      gltfPath: itemDef ? itemDef.gltfPath : null,
      tradeable: itemDef ? itemDef.tradeable : true,
      stackable: itemDef ? itemDef.stackable : false,
      maxStack: itemDef ? itemDef.maxStack : 1,
      type: itemDef ? itemDef.type : 'generic'
    };
  }
  
  // Remove item from world (memory)
  worldItems.delete(data.itemUuid);
  
  // Remove item from world_items table in DB
  statements.removeWorldItem.run(data.itemUuid);
  
  // Save item to player_inventory table in DB if we added a new item (not stacked)
  if (existingSlotIndex === -1) {
    statements.setInventoryItem.run(
      socket.userId || socket.id, // Use userId for authenticated users, socket.id for guests
      emptySlotIndex,
      itemToPickup.id,
      itemToPickup.name,
      itemToPickup.description,
      1 // Initial quantity is 1
    );
  }
  
  // Send updated inventory to client
  socket.emit('inventory update', {
    inventory: player.inventory,
    item: itemToPickup, // Send the picked up item details
    message: `Picked up ${itemToPickup.name}`
  });
  
  // Notify all clients that item was removed from world
  io.emit('item removed', data.itemUuid);
  
  console.log(`Player ${socket.id} picked up item ${data.itemUuid}`);
}

/**
 * Handle item drop
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Object} player - The player object
 * @param {Object} data - The drop data
 * @param {Map} worldItems - The map of world items
 */
function handleDrop(socket, io, player, data, worldItems) {
  // Get the item being dropped
  const droppedItem = player.inventory[data.slotIndex];
  
  if (droppedItem) {
    // Remove from inventory
    player.inventory[data.slotIndex] = null;
    
    // Remove from database
    statements.removeInventoryItem.run(socket.userId || socket.id, data.slotIndex);
    
    // Create a new world item at the player's position
    const itemUuid = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const worldItem = {
      uuid: itemUuid,
      id: droppedItem.id,
      name: droppedItem.name,
      description: droppedItem.description || '',
      position: {
        x: player.position.x,
        y: 0.15, // Slightly above ground
        z: player.position.z
      }
    };
    
    // Add to memory
    worldItems.set(itemUuid, worldItem);
    
    // Add to database
    statements.addWorldItem.run(
      itemUuid,
      worldItem.id,
      worldItem.name,
      worldItem.description,
      worldItem.position.x,
      worldItem.position.y,
      worldItem.position.z
    );
    
    // Notify all clients about the new world item
    io.emit('add world item', worldItem);
    
    // Notify about inventory update
    socket.emit('inventory update', {
      inventory: player.inventory,
      message: `Dropped ${droppedItem.name}`
    });
    
    // Notify other clients about the player's inventory change
    socket.broadcast.emit('player inventory update', {
      playerId: socket.id,
      slotIndex: data.slotIndex,
      item: null
    });
  }
}

/**
 * Handle item movement between inventory slots
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Object} player - The player object
 * @param {Object} data - The move data
 */
function handleMove(socket, io, player, data) {
  // Move item between slots
  const sourceItem = player.inventory[data.sourceSlotIndex];
  const targetItem = player.inventory[data.targetSlotIndex];
  
  // Skip if source slot is empty
  if (!sourceItem) return;
  
  // Get item definition for source item
  const sourceItemDef = getItemById(sourceItem.id);
  const isStackable = sourceItemDef && sourceItemDef.stackable;
  
  // Swap items in memory
  player.inventory[data.targetSlotIndex] = sourceItem;
  player.inventory[data.sourceSlotIndex] = targetItem;
  
  // Update database - first remove both items if they exist
  if (sourceItem) {
    statements.removeInventoryItem.run(socket.userId || socket.id, data.sourceSlotIndex);
  }
  
  if (targetItem) {
    statements.removeInventoryItem.run(socket.userId || socket.id, data.targetSlotIndex);
  }
  
  // Then add them back in their new positions
  if (sourceItem) {
    statements.setInventoryItem.run(
      socket.userId || socket.id,
      data.targetSlotIndex,
      sourceItem.id,
      sourceItem.name,
      sourceItem.description || '',
      sourceItem.quantity || 1
    );
  }
  
  if (targetItem) {
    statements.setInventoryItem.run(
      socket.userId || socket.id,
      data.sourceSlotIndex,
      targetItem.id,
      targetItem.name,
      targetItem.description || '',
      targetItem.quantity || 1
    );
  }
  
  // Notify about inventory update
  socket.emit('inventory update', {
    inventory: player.inventory,
    message: targetItem ? 'Swapped items' : 'Moved item'
  });
  
  // Notify other clients about the player's inventory change
  socket.broadcast.emit('player inventory update', {
    playerId: socket.id,
    sourceSlotIndex: data.sourceSlotIndex,
    targetSlotIndex: data.targetSlotIndex,
    sourceItem: player.inventory[data.sourceSlotIndex],
    targetItem: player.inventory[data.targetSlotIndex]
  });
}
