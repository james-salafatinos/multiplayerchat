// server/db/index.js
// Database setup and prepared statements

import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const db = new Database(join(__dirname, '../../chat.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS player_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    quantity INTEGER DEFAULT 1,
    UNIQUE(player_id, slot_index)
  );
  
  CREATE TABLE IF NOT EXISTS world_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_uuid TEXT NOT NULL UNIQUE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );
  
  CREATE TABLE IF NOT EXISTS player_state (
    user_id INTEGER PRIMARY KEY,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    position_z REAL NOT NULL,
    color TEXT NOT NULL
  );
`);

// Check if quantity column exists in player_inventory table, if not add it
const tableInfo = db.prepare("PRAGMA table_info(player_inventory)").all();
const hasQuantityColumn = tableInfo.some(column => column.name === 'quantity');

if (!hasQuantityColumn) {
  console.log('Adding quantity column to player_inventory table...');
  db.exec('ALTER TABLE player_inventory ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
  console.log('Successfully added quantity column to player_inventory table');
}

// Check if item_id in player_inventory and world_items is TEXT type, if not update it
const playerInventoryColumns = tableInfo.find(column => column.name === 'item_id');
if (playerInventoryColumns && playerInventoryColumns.type === 'INTEGER') {
  console.log('Converting item_id column in player_inventory from INTEGER to TEXT...');
  // SQLite doesn't support ALTER COLUMN, so we need to create a new table and copy data
  db.exec(`
    BEGIN TRANSACTION;
    
    -- Create a temporary table with the new schema
    CREATE TABLE player_inventory_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      slot_index INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      UNIQUE(player_id, slot_index)
    );
    
    -- Copy data from the old table to the new one, converting item_id to TEXT
    INSERT INTO player_inventory_new (id, player_id, slot_index, item_id, item_name, item_description, quantity)
    SELECT id, player_id, slot_index, CAST(item_id AS TEXT), item_name, item_description, 1 FROM player_inventory;
    
    -- Drop the old table
    DROP TABLE player_inventory;
    
    -- Rename the new table to the original name
    ALTER TABLE player_inventory_new RENAME TO player_inventory;
    
    COMMIT;
  `);
  console.log('Successfully converted item_id in player_inventory to TEXT');
}

// Do the same for world_items table
const worldItemsInfo = db.prepare("PRAGMA table_info(world_items)").all();
const worldItemsColumns = worldItemsInfo.find(column => column.name === 'item_id');
if (worldItemsColumns && worldItemsColumns.type === 'INTEGER') {
  console.log('Converting item_id column in world_items from INTEGER to TEXT...');
  db.exec(`
    BEGIN TRANSACTION;
    
    -- Create a temporary table with the new schema
    CREATE TABLE world_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_uuid TEXT NOT NULL UNIQUE,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_description TEXT,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      position_z REAL NOT NULL
    );
    
    -- Copy data from the old table to the new one, converting item_id to TEXT
    INSERT INTO world_items_new (id, item_uuid, item_id, item_name, item_description, position_x, position_y, position_z)
    SELECT id, item_uuid, CAST(item_id AS TEXT), item_name, item_description, position_x, position_y, position_z FROM world_items;
    
    -- Drop the old table
    DROP TABLE world_items;
    
    -- Rename the new table to the original name
    ALTER TABLE world_items_new RENAME TO world_items;
    
    COMMIT;
  `);
  console.log('Successfully converted item_id in world_items to TEXT');
}

// Prepare statements
const statements = {
  // Message statements
  insertMessage: db.prepare('INSERT INTO messages (username, content) VALUES (?, ?)'),
  getRecentMessages: db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50'),
  
  // Inventory statements
  getPlayerInventory: db.prepare('SELECT * FROM player_inventory WHERE player_id = ? ORDER BY slot_index'),
  setInventoryItem: db.prepare('INSERT OR REPLACE INTO player_inventory (player_id, slot_index, item_id, item_name, item_description, quantity) VALUES (?, ?, ?, ?, ?, ?)'),
  updateInventoryItemQuantity: db.prepare('UPDATE player_inventory SET quantity = ? WHERE player_id = ? AND slot_index = ?'),
  removeInventoryItem: db.prepare('DELETE FROM player_inventory WHERE player_id = ? AND slot_index = ?'),
  clearPlayerInventory: db.prepare('DELETE FROM player_inventory WHERE player_id = ?'),
  
  // World item statements
  getWorldItems: db.prepare('SELECT * FROM world_items'),
  addWorldItem: db.prepare('INSERT OR REPLACE INTO world_items (item_uuid, item_id, item_name, item_description, position_x, position_y, position_z) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  removeWorldItem: db.prepare('DELETE FROM world_items WHERE item_uuid = ?'),
  
  // User authentication statements
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  createUser: db.prepare('INSERT INTO users (username, password) VALUES (?, ?)'),
  updateLastLogin: db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'),
  
  // Player state statements
  getPlayerState: db.prepare('SELECT * FROM player_state WHERE user_id = ?'),
  savePlayerState: db.prepare('INSERT OR REPLACE INTO player_state (user_id, position_x, position_y, position_z, color) VALUES (?, ?, ?, ?, ?)'),
  updatePlayerColor: db.prepare('UPDATE player_state SET color = ? WHERE user_id = ?')
};

export { db, statements };
