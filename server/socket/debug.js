// server/socket/debug.js
// Socket handlers for debug functionality

// Cache for debug data
const debugCache = {
  entities: [],
  players: [],
  items: []
};

/**
 * Initialize debug socket handlers
 * @param {Object} io - The Socket.io server instance
 * @param {Map} players - Map of connected players
 * @param {Map} worldItems - Map of world items
 */
export function initDebugHandlers(io, players, worldItems) {
  io.on('connection', (socket) => {
    // Handle debug data from clients
    socket.on('debug-entities-data', (data) => {
      console.log(`[Debug] Received entities data from client ${socket.id}`);
      debugCache.entities = data;
    });

    socket.on('debug-players-data', (data) => {
      console.log(`[Debug] Received players data from client ${socket.id}`);
      debugCache.players = data;
    });

    socket.on('debug-items-data', (data) => {
      console.log(`[Debug] Received items data from client ${socket.id}`);
      debugCache.items = data;
    });
  });
}

/**
 * Request debug data from all connected clients
 * @param {Object} io - The Socket.io server instance
 */
export function requestDebugData(io) {
  io.emit('request-debug-entities');
  io.emit('request-debug-players');
  io.emit('request-debug-items');
}

/**
 * Get the cached debug entities data
 * @returns {Array} Array of entity objects
 */
export function getDebugEntities() {
  return debugCache.entities;
}

/**
 * Get the cached debug players data
 * @returns {Array} Array of player objects
 */
export function getDebugPlayers() {
  return debugCache.players;
}

/**
 * Get the cached debug items data
 * @returns {Array} Array of item objects
 */
export function getDebugItems() {
  return debugCache.items;
}
