// server/socket/trade.js
// Trade functionality for socket.io

import { statements } from '../db/index.js';
import { activeSessions } from '../routes/auth.js';

// Map of active trades by trade ID
const activeTrades = new Map();

/**
 * Initialize trade handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 */
export function initTradeHandlers(socket, io, players) {
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
      completeTrade(trade, io, players);
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
      completeTrade(trade, io, players);
    }
  });
  
  // Handle disconnection for trades
  socket.on('disconnect', () => {
    // Cancel any active trades involving this player
    for (const [tradeId, trade] of activeTrades.entries()) {
      if (trade.fromPlayerId === socket.id || trade.toPlayerId === socket.id) {
        console.log(`Canceling trade ${tradeId} due to player disconnect: ${socket.id}`);
        
        // Notify the other player
        const otherPlayerId = trade.fromPlayerId === socket.id ? trade.toPlayerId : trade.fromPlayerId;
        const otherSocket = io.sockets.sockets.get(otherPlayerId);
        
        if (otherSocket) {
          otherSocket.emit('trade cancel', {
            fromPlayerId: trade.fromPlayerId,
            toPlayerId: trade.toPlayerId,
            reason: 'Player disconnected'
          });
          
          // Make sure the other player's session is marked as active
          if (otherSocket.userId) {
            console.log(`Ensuring session for other player ${otherSocket.userId} remains active after trade cancel`);
            // This will update the lastActivity timestamp
            if (activeSessions.has(otherSocket.userId)) {
              const session = activeSessions.get(otherSocket.userId);
              session.lastActivity = Date.now();
              activeSessions.set(otherSocket.userId, session);
            }
          }
        }
        
        // Remove the trade
        activeTrades.delete(tradeId);
      }
    }
  });
}

/**
 * Complete a trade between two players
 * @param {Object} trade - The trade to complete
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 */
function completeTrade(trade, io, players) {
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
    // Get user IDs for database operations (instead of socket IDs)
    const fromUserId = fromPlayer.userId;
    const toUserId = toPlayer.userId;
    
    // Log the user IDs for debugging
    console.log(`Trade between users: ${fromUserId} and ${toUserId}`);
    
    if (!fromUserId || !toUserId) {
      console.error('Missing user IDs for trade persistence');
      console.log('FromPlayer:', fromPlayer);
      console.log('ToPlayer:', toPlayer);
      // Continue with socket IDs if user IDs not available (for guests)
    }
    
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
      
      // Update database - use user IDs instead of socket IDs for persistence
      statements.removeInventoryItem.run(
        fromUserId || trade.fromPlayerId, 
        item.inventoryIndex
      );
      
      statements.setInventoryItem.run(
        toUserId || trade.toPlayerId,
        emptySlotIndex,
        sourceItem.id,
        sourceItem.name,
        sourceItem.description || ''
      );
      
      console.log(`Moved item from user ${fromUserId || trade.fromPlayerId} to user ${toUserId || trade.toPlayerId}`);
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
      
      // Update database - use user IDs instead of socket IDs for persistence
      statements.removeInventoryItem.run(
        toUserId || trade.toPlayerId, 
        item.inventoryIndex
      );
      
      statements.setInventoryItem.run(
        fromUserId || trade.fromPlayerId,
        emptySlotIndex,
        sourceItem.id,
        sourceItem.name,
        sourceItem.description || ''
      );
      
      console.log(`Moved item from user ${toUserId || trade.toPlayerId} to user ${fromUserId || trade.fromPlayerId}`);
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

export { activeTrades };
