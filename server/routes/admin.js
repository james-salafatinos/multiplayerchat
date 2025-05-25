// server/routes/admin.js
// Admin routes for database management and stats

import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, statements } from '../db/index.js';

// Create a function that returns a router with access to the players Map
export default function createAdminRouter(players) {
  const router = express.Router();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

// Get all messages
router.get('/db/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC').all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get database stats
router.get('/db/stats', (req, res) => {
  try {
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const latestMessage = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 1').get();
    res.json({
      messageCount: messageCount.count,
      latestMessage,
      databasePath: join(__dirname, '../../chat.db'),
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player inventory
router.get('/db/inventory/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const inventory = statements.getPlayerInventory.all(playerId);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all inventories
router.get('/db/inventory', (req, res) => {
  try {
    const inventory = db.prepare('SELECT * FROM player_inventory ORDER BY player_id, slot_index').all();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all world items
router.get('/db/world-items', (req, res) => {
  try {
    const items = statements.getWorldItems.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connected players
router.get('/db/players', (req, res) => {
  try {
    const connectedPlayers = Array.from(players.entries()).map(([id, player]) => ({
      id,
      username: player.username,
      position: player.position,
      color: player.color,
      inventoryCount: player.inventory ? player.inventory.filter(item => item !== null).length : 0
    }));
    res.json(connectedPlayers);
  } catch (error) {
    console.error('Error getting connected players:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all data from all tables
router.get('/db/all-tables', (req, res) => {
  try {
    // Get list of all tables
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();

    // Fetch all data from each table
    const result = {};
    
    for (const { name } of tables) {
      try {
        // Use a prepared statement to safely query each table
        // First verify the table exists and is not a system table
        const tableInfo = db.prepare(`PRAGMA table_info(${name})`).all();
        if (tableInfo && tableInfo.length > 0) {
          // If we can get table info, it's safe to query
          result[name] = db.prepare(`SELECT * FROM "${name}"`).all();
        }
      } catch (error) {
        console.error(`Error fetching data from table ${name}:`, error);
        result[name] = { 
          error: `Failed to fetch data: ${error.message}`,
          details: error.toString()
        };
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tables: Object.keys(result),
      data: result
    });
  } catch (error) {
    console.error('Error fetching all tables:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch database tables'
    });
  }
});

  return router;
}
