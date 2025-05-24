// server/server.js
// Main server file for the multiplayer ThreeJS application

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Set up static file serving from the public directory
app.use(express.static(join(__dirname, '../public')));

// Database admin endpoints
app.get('/admin/db/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC').all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/db/stats', (req, res) => {
  try {
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const latestMessage = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 1').get();
    res.json({
      messageCount: messageCount.count,
      latestMessage,
      databasePath: join(__dirname, '../chat.db'),
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Additional database API endpoints
app.get('/admin/db/inventory/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const inventory = getPlayerInventory.all(playerId);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/db/inventory', (req, res) => {
  try {
    const inventory = db.prepare('SELECT * FROM player_inventory ORDER BY player_id, slot_index').all();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/db/world-items', (req, res) => {
  try {
    const items = getWorldItems.all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/db/players', (req, res) => {
  try {
    const connectedPlayers = Array.from(players.entries()).map(([id, player]) => ({
      id,
      username: player.username,
      position: player.position,
      color: player.color,
      inventoryCount: player.inventory.filter(item => item !== null).length
    }));
    res.json(connectedPlayers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize SQLite database
const db = new Database(join(__dirname, '../chat.db'));

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
`);

// Prepare statements
const insertMessage = db.prepare('INSERT INTO messages (username, content) VALUES (?, ?)');
const getRecentMessages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50');

// Inventory statements
const getPlayerInventory = db.prepare('SELECT * FROM player_inventory WHERE player_id = ? ORDER BY slot_index');
const setInventoryItem = db.prepare('INSERT OR REPLACE INTO player_inventory (player_id, slot_index, item_id, item_name, item_description) VALUES (?, ?, ?, ?, ?)');
const removeInventoryItem = db.prepare('DELETE FROM player_inventory WHERE player_id = ? AND slot_index = ?');
const clearPlayerInventory = db.prepare('DELETE FROM player_inventory WHERE player_id = ?');

// World item statements
const getWorldItems = db.prepare('SELECT * FROM world_items');
const addWorldItem = db.prepare('INSERT OR REPLACE INTO world_items (item_uuid, item_id, item_name, item_description, position_x, position_y, position_z) VALUES (?, ?, ?, ?, ?, ?, ?)');
const removeWorldItem = db.prepare('DELETE FROM world_items WHERE item_uuid = ?');

// Track connected players and world items
const players = new Map();
const worldItems = new Map(); // Map of items in the world by unique ID
const activeTrades = new Map(); // Map of active trades by trade ID

// Initialize world items from database
try {
  const items = getWorldItems.all();
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
        addWorldItem.run(
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Create player data
  const newPlayer = {
    id: socket.id,
    username: `Player-${socket.id.substring(0, 4)}`,
    position: { x: 0, y: 0, z: 0 },
    color: Math.random() * 0xffffff, // Random color for each player
    inventory: Array(28).fill(null) // Initialize empty inventory with 28 slots
  };
  
  // Add default item to player's inventory
  newPlayer.inventory[0] = {
    id: 0,
    name: 'Default Item',
    description: 'The default item that every player starts with'
  };
  
  // Save default item to database
  try {
    setInventoryItem.run(
      socket.id,
      0, // slot index
      0, // item id
      'Default Item',
      'The default item that every player starts with'
    );
  } catch (error) {
    console.error('Error saving default item to database:', error);
  }
  
  // Add player to the players map
  players.set(socket.id, newPlayer);
  
  // Emit other players list to the new client (excluding the new player)
  const otherPlayers = Array.from(players.values()).filter(player => player.id !== socket.id);
  socket.emit('players list', otherPlayers);
  
  // Emit the new player to itself through the player-joined event
  // This ensures the local player is created with isLocalPlayer = true
  socket.emit('player joined', newPlayer);
  
  // Notify other clients about the new player
  // Using socket.broadcast.emit ensures this only goes to other clients, not the sender
  socket.broadcast.emit('player joined', newPlayer);
  
  // Explicitly send the player's initial inventory
  console.log(`Sending initial inventory to player ${socket.id}:`, newPlayer.inventory);
  socket.emit('player inventory', newPlayer.inventory);
  
  // Update user count for all clients
  io.emit('user count', players.size);
  
  // Send recent chat history to newly connected client
  const recentMessages = getRecentMessages.all().reverse();
  socket.emit('chat history', recentMessages);
  
  // Send player's inventory data
  console.log(`Sending player inventory to ${socket.id}:`, JSON.stringify(newPlayer.inventory));
  socket.emit('player inventory', newPlayer.inventory);
  
  // Send world items state
  const worldItemsArray = Array.from(worldItems.values());
  console.log(`Sending world items state to ${socket.id}:`, JSON.stringify(worldItemsArray));
  socket.emit('world items state', worldItemsArray);
  
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
  
  // Handle chat messages
  socket.on('chat message', (data) => {
    const { username, content } = data;
    
    // Save message to database
    const info = insertMessage.run(username, content);
    
    // Broadcast message to all clients with player ID
    io.emit('chat message', {
      id: info.lastInsertRowid,
      username,
      content,
      playerId: socket.id, // Include the player ID for chat bubbles
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle 3D object updates (cube rotation)
  socket.on('update rotation', (rotation) => {
    // Broadcast the rotation update to all other clients
    socket.broadcast.emit('update rotation', rotation);
  });
  
  // Handle player position updates
  socket.on('update position', (data) => {
    console.log('Received position update from client:', socket.id, data);
    
    // Update player data in the players map
    const player = players.get(socket.id);
    if (player) {
      // Update position if provided
      if (data.position) {
        player.position = data.position;
        console.log('Updated player position to:', data.position);
      }
      
      // Update rotation if provided
      if (data.rotation) {
        player.rotation = data.rotation;
        console.log('Updated player rotation to:', data.rotation);
      }
      
      // Update target position if provided
      if (data.targetPosition) {
        player.targetPosition = data.targetPosition;
        console.log('Updated player target position to:', data.targetPosition);
      }
      
      // Add playerId to the data if not already present
      if (!data.playerId) {
        data.playerId = socket.id;
      }
      
      // Broadcast the position update to all other clients
      console.log('Broadcasting player position to other clients:', data);
      socket.broadcast.emit('player position', data);
    } else {
      console.error('Player not found in players map:', socket.id);
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

            // Add item to player's inventory (memory)
            player.inventory[emptySlotIndex] = {
              uuid: itemToPickup.uuid, // Store UUID for potential future drop identification
              id: itemToPickup.id,
              name: itemToPickup.name,
              description: itemToPickup.description,
              // quantity: 1 // If items can stack
            };
            
            // Remove item from world (memory)
            worldItems.delete(data.itemUuid);
            
            // Remove item from world_items table in DB
            removeWorldItem.run(data.itemUuid);
            
            // Save item to player_inventory table in DB
            setInventoryItem.run(
              socket.id,
              emptySlotIndex,
              itemToPickup.id,
              itemToPickup.name,
              itemToPickup.description
            );
            
            // Send updated inventory to client
            socket.emit('inventory update', {
              inventory: player.inventory,
              item: itemToPickup, // Send the picked up item details
              message: `Picked up ${itemToPickup.name}`
            });
            
            // Notify all clients that item was removed from world
            io.emit('item removed', data.itemUuid);
            
            console.log(`Player ${socket.id} picked up item ${data.itemUuid}`);
            break;
            
          case 'drop':
            // Get the item being dropped
            const droppedItem = player.inventory[data.slotIndex];
            
            if (droppedItem) {
              // Remove from inventory
              player.inventory[data.slotIndex] = null;
              
              // Remove from database
              removeInventoryItem.run(socket.id, data.slotIndex);
              
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
              addWorldItem.run(
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
              io.emit('inventory update', {
                playerId: socket.id,
                ...data
              });
            }
            break;
            
          case 'move':
            // Move item between slots
            const sourceItem = player.inventory[data.sourceSlotIndex];
            const targetItem = player.inventory[data.targetSlotIndex];
            
            // Skip if source slot is empty
            if (!sourceItem) break;
            
            // Swap items in memory
            player.inventory[data.targetSlotIndex] = sourceItem;
            player.inventory[data.sourceSlotIndex] = targetItem;
            
            // Update database - first remove both items if they exist
            if (sourceItem) {
              removeInventoryItem.run(socket.id, data.sourceSlotIndex);
            }
            
            if (targetItem) {
              removeInventoryItem.run(socket.id, data.targetSlotIndex);
            }
            
            // Then add them back in their new positions
            if (sourceItem) {
              setInventoryItem.run(
                socket.id,
                data.targetSlotIndex,
                sourceItem.id,
                sourceItem.name,
                sourceItem.description || ''
              );
            }
            
            if (targetItem) {
              setInventoryItem.run(
                socket.id,
                data.sourceSlotIndex,
                targetItem.id,
                targetItem.name,
                targetItem.description || ''
              );
            }
            
            // Notify about inventory update
            io.emit('inventory update', {
              playerId: socket.id,
              ...data
            });
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

  // Handle trade request
  socket.on('trade request', (data) => {
    // Validate the request
    if (!data.fromPlayerId || !data.toPlayerId) {
      console.error('Invalid trade request data');
      return;
    }
    
    // Get the players
    const fromPlayer = players.get(data.fromPlayerId);
    const toPlayer = players.get(data.toPlayerId);
    
    if (!fromPlayer || !toPlayer) {
      console.error('One or both players not found');
      return;
    }
    
    // Create a unique trade ID
    const tradeId = `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a new trade
    const trade = {
      id: tradeId,
      fromPlayerId: data.fromPlayerId,
      toPlayerId: data.toPlayerId,
      fromPlayerItems: [],
      toPlayerItems: [],
      fromPlayerAccepted: false,
      toPlayerAccepted: false,
      status: 'pending' // pending, accepted, completed, cancelled
    };
    
    // Add trade to active trades
    activeTrades.set(tradeId, trade);
    
    // Forward the trade request to the target player
    const toSocket = io.sockets.sockets.get(data.toPlayerId);
    if (toSocket) {
      toSocket.emit('trade request', {
        tradeId,
        fromPlayerId: data.fromPlayerId,
        fromPlayerName: fromPlayer.username
      });
    }
  });
  
  // Handle trade request response
  socket.on('trade request response', (data) => {
    console.log('Trade request response received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Forward the response to the other player
    const otherPlayerId = data.fromPlayerId === socket.id ? data.toPlayerId : data.fromPlayerId;
    const otherSocket = io.sockets.sockets.get(otherPlayerId);
    
    if (otherSocket) {
      otherSocket.emit('trade request response', {
        tradeId: trade.id,
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId,
        accepted: data.accepted
      });
    }
    
    // If declined, remove the trade
    if (!data.accepted) {
      activeTrades.delete(trade.id);
    }
  });
  
  // Handle trade update (adding/removing items)
  socket.on('trade update', (data) => {
    console.log('Trade update received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Update the offered items
    if (socket.id === trade.fromPlayerId) {
      trade.fromPlayerItems = data.offeredItems;
      trade.fromPlayerAccepted = false;
      trade.toPlayerAccepted = false;
    } else if (socket.id === trade.toPlayerId) {
      trade.toPlayerItems = data.offeredItems;
      trade.fromPlayerAccepted = false;
      trade.toPlayerAccepted = false;
    }
    
    // Forward the update to the other player
    const otherPlayerId = socket.id === trade.fromPlayerId ? trade.toPlayerId : trade.fromPlayerId;
    const otherSocket = io.sockets.sockets.get(otherPlayerId);
    
    if (otherSocket) {
      otherSocket.emit('trade update', {
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId,
        offeredItems: socket.id === trade.fromPlayerId ? trade.fromPlayerItems : trade.toPlayerItems
      });
    }
  });
  
  // Handle trade acceptance
  socket.on('trade accept', (data) => {
    console.log('Trade acceptance received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Update acceptance status
    if (socket.id === trade.fromPlayerId) {
      trade.fromPlayerAccepted = data.accepted;
    } else if (socket.id === trade.toPlayerId) {
      trade.toPlayerAccepted = data.accepted;
    }
    
    // Forward the acceptance to the other player
    const otherPlayerId = socket.id === trade.fromPlayerId ? trade.toPlayerId : trade.fromPlayerId;
    const otherSocket = io.sockets.sockets.get(otherPlayerId);
    
    if (otherSocket) {
      otherSocket.emit('trade accept', {
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId,
        accepted: data.accepted
      });
    }
    
    // Check if both players have accepted
    if (trade.fromPlayerAccepted && trade.toPlayerAccepted) {
      // Complete the trade
      completeTrade(trade);
    }
  });
  
  // Handle trade cancellation
  socket.on('trade cancel', (data) => {
    console.log('Trade cancellation received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Forward the cancellation to the other player
    const otherPlayerId = socket.id === trade.fromPlayerId ? trade.toPlayerId : trade.fromPlayerId;
    const otherSocket = io.sockets.sockets.get(otherPlayerId);
    
    if (otherSocket) {
      otherSocket.emit('trade cancel', {
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId
      });
    }
    
    // Remove the trade
    activeTrades.delete(trade.id);
  });
  
  // Handle trade modification (reset acceptance)
  socket.on('trade modify', (data) => {
    console.log('Trade modification received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Reset acceptance for both players
    trade.fromPlayerAccepted = false;
    trade.toPlayerAccepted = false;
    
    // Forward the modification to the other player
    const otherPlayerId = socket.id === trade.fromPlayerId ? trade.toPlayerId : trade.fromPlayerId;
    const otherSocket = io.sockets.sockets.get(otherPlayerId);
    
    if (otherSocket) {
      otherSocket.emit('trade modify', {
        fromPlayerId: data.fromPlayerId,
        toPlayerId: data.toPlayerId
      });
    }
  });
  
  // Handle trade completion
  socket.on('trade complete', (data) => {
    console.log('Trade completion received:', data);
    
    // Find the trade by player IDs
    const trade = Array.from(activeTrades.values()).find(t => 
      (t.fromPlayerId === data.fromPlayerId && t.toPlayerId === data.toPlayerId) ||
      (t.fromPlayerId === data.toPlayerId && t.toPlayerId === data.fromPlayerId)
    );
    
    if (!trade) {
      console.error('Trade not found');
      return;
    }
    
    // Complete the trade if not already completed
    if (trade.status !== 'completed') {
      completeTrade(trade);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Cancel any active trades involving this player
    for (const [tradeId, trade] of activeTrades.entries()) {
      if (trade.fromPlayerId === socket.id || trade.toPlayerId === socket.id) {
        // Notify the other player
        const otherPlayerId = trade.fromPlayerId === socket.id ? trade.toPlayerId : trade.fromPlayerId;
        const otherSocket = io.sockets.sockets.get(otherPlayerId);
        
        if (otherSocket) {
          otherSocket.emit('trade cancel', {
            fromPlayerId: trade.fromPlayerId,
            toPlayerId: trade.toPlayerId,
            reason: 'Player disconnected'
          });
        }
        
        // Remove the trade
        activeTrades.delete(tradeId);
      }
    }
    
    // Remove player from players map
    players.delete(socket.id);
    
    // Notify other clients about the player leaving
    socket.broadcast.emit('player left', { playerId: socket.id });
    
    // Update user count for all clients
    io.emit('user count', players.size);
    
    // Note: We don't delete inventory data on disconnect to persist it for when the player returns
  });
});

/**
 * Complete a trade between two players
 * @param {Object} trade - The trade to complete
 */
function completeTrade(trade) {
  console.log('Completing trade:', trade);
  
  // Update trade status
  trade.status = 'completed';
  
  // Get the players
  const fromPlayer = players.get(trade.fromPlayerId);
  const toPlayer = players.get(trade.toPlayerId);
  
  if (!fromPlayer || !toPlayer) {
    console.error('One or both players not found');
    return;
  }
  
  // Process the trade items
  try {
    // Process items from fromPlayer to toPlayer
    for (const item of trade.fromPlayerItems) {
      // Remove item from fromPlayer's inventory
      const sourceItem = fromPlayer.inventory[item.inventoryIndex];
      fromPlayer.inventory[item.inventoryIndex] = null;
      
      // Find an empty slot in toPlayer's inventory
      const emptySlotIndex = toPlayer.inventory.findIndex(slot => slot === null);
      
      if (emptySlotIndex === -1) {
        console.error('Recipient inventory full, cannot complete trade');
        return;
      }
      
      // Add item to toPlayer's inventory
      toPlayer.inventory[emptySlotIndex] = sourceItem;
      
      // Update database
      removeInventoryItem.run(trade.fromPlayerId, item.inventoryIndex);
      
      setInventoryItem.run(
        trade.toPlayerId,
        emptySlotIndex,
        sourceItem.id,
        sourceItem.name,
        sourceItem.description || ''
      );
    }
    
    // Process items from toPlayer to fromPlayer
    for (const item of trade.toPlayerItems) {
      // Remove item from toPlayer's inventory
      const sourceItem = toPlayer.inventory[item.inventoryIndex];
      toPlayer.inventory[item.inventoryIndex] = null;
      
      // Find an empty slot in fromPlayer's inventory
      const emptySlotIndex = fromPlayer.inventory.findIndex(slot => slot === null);
      
      if (emptySlotIndex === -1) {
        console.error('Recipient inventory full, cannot complete trade');
        return;
      }
      
      // Add item to fromPlayer's inventory
      fromPlayer.inventory[emptySlotIndex] = sourceItem;
      
      // Update database
      removeInventoryItem.run(trade.toPlayerId, item.inventoryIndex);
      
      setInventoryItem.run(
        trade.fromPlayerId,
        emptySlotIndex,
        sourceItem.id,
        sourceItem.name,
        sourceItem.description || ''
      );
    }
    
    // Notify both players of the trade completion
    const fromSocket = io.sockets.sockets.get(trade.fromPlayerId);
    const toSocket = io.sockets.sockets.get(trade.toPlayerId);
    
    // Send updated inventories
    if (fromSocket) {
      fromSocket.emit('player inventory', fromPlayer.inventory);
      fromSocket.emit('trade complete', { success: true });
    }
    
    if (toSocket) {
      toSocket.emit('player inventory', toPlayer.inventory);
      toSocket.emit('trade complete', { success: true });
    }
    
    // Remove the trade
    activeTrades.delete(trade.id);
    
    console.log('Trade completed successfully');
  } catch (error) {
    console.error('Error completing trade:', error);
    
    // Notify players of failure
    const fromSocket = io.sockets.sockets.get(trade.fromPlayerId);
    const toSocket = io.sockets.sockets.get(trade.toPlayerId);
    
    if (fromSocket) {
      fromSocket.emit('trade complete', { success: false, error: 'Server error processing trade' });
    }
    
    if (toSocket) {
      toSocket.emit('trade complete', { success: false, error: 'Server error processing trade' });
    }
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Open http://localhost:3000 in your browser to view the application');
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
    
    // Close the HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      
      // Close the database connection
      if (db) {
        try {
          db.close();
          console.log('Database connection closed');
        } catch (err) {
          console.error('Error closing database:', err);
        }
      }
      
      console.log('Server shut down successfully');
      // Force exit after a timeout in case something is still hanging
      setTimeout(() => {
        console.log('Forcing process exit');
        process.exit(0);
      }, 1000);
    });
  });
});
