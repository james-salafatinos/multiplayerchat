// server/utils/worldItems.js
// World items initialization and management

import { statements } from '../db/index.js';

/**
 * Initialize world items from database or create default items if none exist
 * @returns {Map} A map of world items by UUID
 */
export function initializeWorldItems() {
  // Create a new map for world items
  const worldItems = new Map();
  
  try {
    // Load items from database
    const items = statements.getWorldItems.all();
    items.forEach(item => {
      worldItems.set(item.item_uuid, {
        uuid: item.item_uuid,
        id: item.item_id,
        name: item.item_name,
        description: item.item_description,
        position: {
          x: item.position_x,
          y: item.position_y,
          z: item.position_z
        }
      });
    });
    console.log(`Loaded ${worldItems.size} items from database`);
    
    // If no items in database, create initial items
    if (worldItems.size === 0) {
      console.log('Creating initial world items as database was empty.');
      const initialItems = [
        { uuid: 'item-1', id: 1, name: 'Basic Item', description: 'A basic item that can be picked up', position: { x: 2, y: 0.15, z: 2 } },
        { uuid: 'item-2', id: 1, name: 'Basic Item', description: 'A basic item that can be picked up', position: { x: -2, y: 0.15, z: 2 } },
        { uuid: 'item-3', id: 1, name: 'Basic Item', description: 'A basic item that can be picked up', position: { x: 2, y: 0.15, z: -2 } },
        // { uuid: 'item-4', id: 1, name: 'Basic Item', description: 'A basic item that can be picked up', position: { x: -2, y: 0.15, z: -2 } } // Let's start with 3 for now
      ];
      
      initialItems.forEach(item => {
        console.log(`Attempting to add initial item to worldItems map and DB: ${JSON.stringify(item)}`);
        worldItems.set(item.uuid, item);
        try {
          statements.addWorldItem.run(
            item.uuid,
            item.id,
            item.name,
            item.description,
            item.position.x,
            item.position.y,
            item.position.z
          );
          console.log(`Successfully added item ${item.uuid} to DB.`);
        } catch (dbError) {
          console.error(`Error adding item ${item.uuid} to DB:`, dbError);
        }
      });
      console.log(`Finished creating initial world items. World items count: ${worldItems.size}`);
    }
  } catch (error) {
    console.error('Error initializing world items:', error);
  }
  
  return worldItems;
}

/**
 * Add a new item to the world
 * @param {Map} worldItems - The map of world items
 * @param {Object} item - The item to add
 * @returns {Boolean} Success status
 */
export function addWorldItem(worldItems, item) {
  try {
    // Add to memory
    worldItems.set(item.uuid, item);
    
    // Add to database
    statements.addWorldItem.run(
      item.uuid,
      item.id,
      item.name,
      item.description || '',
      item.position.x,
      item.position.y,
      item.position.z
    );
    
    return true;
  } catch (error) {
    console.error('Error adding world item:', error);
    return false;
  }
}

/**
 * Remove an item from the world
 * @param {Map} worldItems - The map of world items
 * @param {String} itemUuid - The UUID of the item to remove
 * @returns {Boolean} Success status
 */
export function removeWorldItem(worldItems, itemUuid) {
  try {
    // Remove from memory
    worldItems.delete(itemUuid);
    
    // Remove from database
    statements.removeWorldItem.run(itemUuid);
    
    return true;
  } catch (error) {
    console.error('Error removing world item:', error);
    return false;
  }
}
