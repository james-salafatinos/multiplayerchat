// server/routes/debug.js
// Debug API routes for the debug dashboard

import express from 'express';
import { getDebugEntities, getDebugPlayers, getDebugItems, requestDebugData } from '../socket/debug.js';

// Create a function that returns a debug router
export default function createDebugRouter(players, worldItems) {
  const router = express.Router();

  // Get all entities from the world
  router.get('/entities', (req, res) => {
    try {
      // Request fresh data from connected clients
      requestDebugData(req.app.get('io'));
      
      // Get cached entity data
      const entities = getDebugEntities();
      
      res.json(entities);
    } catch (error) {
      console.error('Error fetching entities:', error);
      res.status(500).json({ error: 'Failed to fetch entities' });
    }
  });

  // Get all connected players with their details
  router.get('/players', (req, res) => {
    try {
      // Request fresh data from connected clients
      requestDebugData(req.app.get('io'));
      
      // Get cached player data
      const cachedPlayers = getDebugPlayers();
      
      // Combine with server-side player data
      const playersList = [];
      
      // If we have cached data from clients, use that
      if (cachedPlayers && cachedPlayers.length > 0) {
        res.json(cachedPlayers);
        return;
      }
      
      // Fallback to server-side player data if no client data is available
      players.forEach((playerData, socketId) => {
        // Extract relevant player data
        const player = {
          id: socketId,
          username: playerData.username || 'Anonymous',
          position: playerData.position || { x: 0, y: 0, z: 0 },
          rotation: playerData.rotation || { x: 0, y: 0, z: 0 },
          inventory: playerData.inventory || {},
          skills: playerData.skills || {}
        };
        
        playersList.push(player);
      });
      
      res.json(playersList);
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  });

  // Get all world items
  router.get('/items', (req, res) => {
    try {
      // Request fresh data from connected clients
      requestDebugData(req.app.get('io'));
      
      // Get cached item data
      const cachedItems = getDebugItems();
      
      // If we have cached data from clients, use that
      if (cachedItems && cachedItems.length > 0) {
        res.json(cachedItems);
        return;
      }
      
      // Fallback to server-side item data if no client data is available
      const itemsList = [];
      
      // Convert worldItems to an array suitable for the debug dashboard
      if (worldItems) {
        Object.entries(worldItems).forEach(([itemId, itemData]) => {
          const item = {
            id: itemId,
            type: itemData.type || 'Unknown',
            position: itemData.position || { x: 0, y: 0, z: 0 },
            properties: itemData
          };
          
          itemsList.push(item);
        });
      }
      
      res.json(itemsList);
    } catch (error) {
      console.error('Error fetching world items:', error);
      res.status(500).json({ error: 'Failed to fetch world items' });
    }
  });

  return router;
}
