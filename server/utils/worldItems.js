// server/utils/worldItems.js
// World items initialization and management

import { statements } from '../db/index.js';
import { getItemById } from './itemManager.js';

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
      // Get full item definition from itemManager
      const itemDef = getItemById(item.item_id);
      
      if (!itemDef) {
        console.warn(`Item definition not found for ID: ${item.item_id}`);
      }
      
      // Create a base item with database values
      const worldItem = {
        uuid: item.item_uuid,
        id: item.item_id,
        name: item.item_name,
        description: item.item_description,
        position: {
          x: item.position_x,
          y: item.position_y,
          z: item.position_z
        }
      };
      
      // Add all properties from the item definition
      if (itemDef) {
        // Include all properties from the item definition
        worldItem.gltfPath = itemDef.gltfPath;
        worldItem.inventoryIconPath = itemDef.inventoryIconPath;
        worldItem.tradeable = itemDef.tradeable;
        worldItem.stackable = itemDef.stackable;
        worldItem.maxStack = itemDef.maxStack;
        worldItem.type = itemDef.type;
        worldItem.effects = itemDef.effects;
        
        // Log the full item data for debugging
        console.log(`Loaded world item ${worldItem.name} with gltfPath: ${worldItem.gltfPath}`);
      }
      
      worldItems.set(item.item_uuid, worldItem);
    });
    console.log(`Loaded ${worldItems.size} items from database`);
    
    // If no items in database, create initial items
    if (worldItems.size === 0) {
      console.log('Creating initial world items as database was empty.');
      
      // Use item definitions from itemManager
      const basicItemDef = getItemById('basic_item_01');
      
      if (!basicItemDef) {
        console.error('Failed to get basic item definition from itemManager');
        return worldItems;
      }
      
      const initialItems = [
        { 
          uuid: 'item-1', 
          id: basicItemDef.id, 
          name: basicItemDef.name, 
          description: basicItemDef.description,
          position: { x: 2, y: 0.15, z: 2 },
          gltfPath: basicItemDef.gltfPath,
          inventoryIconPath: basicItemDef.inventoryIconPath
        },
        { 
          uuid: 'item-2', 
          id: basicItemDef.id, 
          name: basicItemDef.name, 
          description: basicItemDef.description,
          position: { x: -2, y: 0.15, z: 2 },
          gltfPath: basicItemDef.gltfPath,
          inventoryIconPath: basicItemDef.inventoryIconPath
        },
        { 
          uuid: 'item-3', 
          id: basicItemDef.id, 
          name: basicItemDef.name, 
          description: basicItemDef.description,
          position: { x: 2, y: 0.15, z: -2 },
          gltfPath: basicItemDef.gltfPath,
          inventoryIconPath: basicItemDef.inventoryIconPath
        }
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
    // If only item ID is provided, get full item details from item manager
    if (item.id) {
      const itemDef = getItemById(item.id);
      if (itemDef) {
        // Only set these if not already provided
        if (!item.name) item.name = itemDef.name;
        if (!item.description) item.description = itemDef.description;
        
        // Always ensure these properties are set from the item definition
        item.gltfPath = item.gltfPath || itemDef.gltfPath;
        item.inventoryIconPath = item.inventoryIconPath || itemDef.inventoryIconPath;
      } else {
        console.warn(`Item definition not found for ID: ${item.id}`);
      }
    }
    
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
