// server/db/migrate.js
// Database migration script to add rotation columns to player_state table

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path - using the correct path from index.js
const dbPath = path.join(__dirname, '../../chat.db');

console.log(`Migrating database at ${dbPath}...`);

// Check if database file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at ${dbPath}`);
  process.exit(1);
}

// Connect to database
const db = new Database(dbPath);

// Begin transaction
db.prepare('BEGIN TRANSACTION').run();

try {
  // Check if rotation columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(player_state)").all();
  const hasRotationX = tableInfo.some(col => col.name === 'rotation_x');
  
  if (!hasRotationX) {
    console.log('Adding rotation columns to player_state table...');
    
    // SQLite has limited ALTER TABLE support, so we need to:
    // 1. Create a new table with the desired schema
    // 2. Copy data from old table to new table
    // 3. Drop old table
    // 4. Rename new table to old table name
    
    // Create new table with rotation columns
    db.prepare(`
      CREATE TABLE player_state_new (
        user_id INTEGER PRIMARY KEY,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        rotation_x REAL DEFAULT 0,
        rotation_y REAL DEFAULT 0,
        rotation_z REAL DEFAULT 0,
        color TEXT NOT NULL
      )
    `).run();
    
    // Copy data from old table to new table
    db.prepare(`
      INSERT INTO player_state_new (user_id, position_x, position_y, position_z, color)
      SELECT user_id, position_x, position_y, position_z, color FROM player_state
    `).run();
    
    // Drop old table
    db.prepare('DROP TABLE player_state').run();
    
    // Rename new table to old table name
    db.prepare('ALTER TABLE player_state_new RENAME TO player_state').run();
    
    console.log('Rotation columns added successfully.');
  } else {
    console.log('Rotation columns already exist. No migration needed.');
  }
  
  // Commit transaction
  db.prepare('COMMIT').run();
  console.log('Migration completed successfully!');
} catch (error) {
  // Rollback transaction on error
  db.prepare('ROLLBACK').run();
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  // Close database connection
  db.close();
}
