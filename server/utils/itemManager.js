// server/utils/itemManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let items = [];
let itemsById = new Map();

/**
 * Loads item definitions from items.json.
 * This should be called once at server startup.
 */
export function loadItems() {
  try {
    // Construct the path relative to the server/config directory
    const itemsPath = path.join(__dirname, '..', 'config', 'items.json');
    const rawData = fs.readFileSync(itemsPath);
    items = JSON.parse(rawData);
    
    itemsById.clear();
    for (const item of items) {
      if (itemsById.has(item.id)) {
        console.warn(`[ItemManager] Duplicate item ID found: ${item.id}. Check items.json.`);
      }
      itemsById.set(item.id, item);
    }
    console.log(`[ItemManager] Successfully loaded ${items.length} items.`);
  } catch (error) {
    console.error('[ItemManager] Error loading items:', error);
    // Depending on how critical items are, you might want to throw the error
    // or exit the process if items cannot be loaded.
    items = [];
    itemsById.clear();
  }
}

/**
 * Retrieves an item's definition by its ID.
 * @param {string} itemId - The unique ID of the item.
 * @returns {Object|null} The item object if found, otherwise null.
 */
export function getItemById(itemId) {
  const item = itemsById.get(itemId) || null;
  console.log(`[ItemManager] getItemById(${itemId}) returned:`, item);
  return item;
}

/**
 * Retrieves all loaded item definitions.
 * @returns {Array<Object>} An array of all item objects.
 */
export function getAllItems() {
  return [...items]; // Return a copy to prevent external modification
}

// Optionally, load items immediately when this module is imported.
// Or, you can call loadItems() explicitly from your main server setup file (e.g., server.js).
loadItems();

// Example usage (for testing, can be removed)
// console.log('Item Manager Loaded. Example item:', getItemById('basic_item_01'));
