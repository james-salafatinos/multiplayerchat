// server/routes/admin.js
// Admin routes for database management and stats

import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db, statements } from '../db/index.js';

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
    // This route depends on the players Map, which will be passed from the main server
    // We'll implement this in the main server.js file
    res.status(501).json({ error: 'Not implemented in this module' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
