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
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    UNIQUE(player_id, slot_index)
  );
  
  CREATE TABLE IF NOT EXISTS world_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_uuid TEXT NOT NULL UNIQUE,
    item_id INTEGER NOT NULL,
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

// Prepare statements
const statements = {
  // Message statements
  insertMessage: db.prepare('INSERT INTO messages (username, content) VALUES (?, ?)'),
  getRecentMessages: db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50'),
  
  // Inventory statements
  getPlayerInventory: db.prepare('SELECT * FROM player_inventory WHERE player_id = ? ORDER BY slot_index'),
  setInventoryItem: db.prepare('INSERT OR REPLACE INTO player_inventory (player_id, slot_index, item_id, item_name, item_description) VALUES (?, ?, ?, ?, ?)'),
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
  savePlayerState: db.prepare('INSERT OR REPLACE INTO player_state (user_id, position_x, position_y, position_z, color) VALUES (?, ?, ?, ?, ?)')
};

export { db, statements };
