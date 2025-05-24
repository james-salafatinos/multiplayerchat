// Network functionality using Socket.io
let socket;
let userCount = 0;
let localPlayerId = null;

/**
 * Initialize the Socket.io connection
 * @returns {Object} The socket instance
 */
export function initNetwork() {
    // Connect to the server
    socket = io();
    
    // Handle connection
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        localPlayerId = socket.id;
        console.log(`[Network.js] Dispatching 'local-player-id-assigned' for ID: ${localPlayerId}`);
        document.dispatchEvent(new CustomEvent('local-player-id-assigned', { detail: { playerId: localPlayerId } }));
    });
    
    // Handle user count updates
    socket.on('user count', (count) => {
        updateUserCount(count);
    });
    
    // Handle cube rotation updates from other clients
    socket.on('update rotation', (rotation) => {
        // This will be handled by the RotationSystem in the ECS
        document.dispatchEvent(new CustomEvent('remote-rotation-update', { 
            detail: rotation 
        }));
    });
    
    // Handle player position updates from other clients
    socket.on('player position', (data) => {
        console.log('Received player position update:', data);
        // This will be handled by the MovementSystem in the ECS
        document.dispatchEvent(new CustomEvent('remote-position-update', { 
            detail: data 
        }));
    });
    
    // Handle initial players list
    socket.on('players list', (players) => {
        // This will be handled by the app.js to create player entities
        document.dispatchEvent(new CustomEvent('players-list', { 
            detail: players 
        }));
    });
    
    
    // Handle new player joined
    socket.on('player joined', (player) => {
        // This will be handled by the app.js to create a new player entity
        document.dispatchEvent(new CustomEvent('player-joined', { 
            detail: player 
        }));
    });
    
    // Handle player left
    socket.on('player left', (data) => {
        // This will be handled by the app.js to remove the player entity
        document.dispatchEvent(new CustomEvent('player-left', { 
            detail: data 
        }));
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        localPlayerId = null;
    });

    // Handle initial player inventory
    socket.on('player inventory', (inventoryData) => {
        console.log('Received player inventory:', inventoryData);
        document.dispatchEvent(new CustomEvent('player-inventory-update', {
            detail: inventoryData
        }));
    });

    // Handle initial world items state
    socket.on('world items state', (items) => {
        console.log('Received world items state:', items);
        document.dispatchEvent(new CustomEvent('world-items-state-update', {
            detail: items
        }));
    });

    // Handle inventory updates (e.g., after pickup, drop, move)
    socket.on('inventory update', (updateData) => {
        console.log('Received inventory update:', updateData);
        document.dispatchEvent(new CustomEvent('local-inventory-changed', {
            detail: updateData
        }));
    });

    // Handle item removed from world
    socket.on('item removed', (itemUuid) => {
        console.log('Received item removed from world:', itemUuid);
        document.dispatchEvent(new CustomEvent('world-item-removed', {
            detail: { uuid: itemUuid }
        }));
    });

    // Handle item added to world
    socket.on('item added', (itemData) => {
        console.log('Received item added to world:', itemData);
        document.dispatchEvent(new CustomEvent('world-item-added', {
            detail: itemData
        }));
    });

    // Handle inventory errors
    socket.on('inventory error', (errorData) => {
        console.error('Received inventory error:', errorData);
        document.dispatchEvent(new CustomEvent('inventory-operation-error', {
            detail: errorData
        }));
        // Basic alert for now, can be improved with a proper UI notification system
        alert(`Inventory Error: ${errorData.message}`);
    });
    
    // Handle trade requests
    socket.on('trade request', (data) => {
        console.log('Received trade request:', data);
        document.dispatchEvent(new CustomEvent('trade-request-received', {
            detail: data
        }));
    });
    
    // Handle trade request responses
    socket.on('trade request response', (data) => {
        console.log('Received trade request response:', data);
        document.dispatchEvent(new CustomEvent('trade-request-response', {
            detail: data
        }));
    });
    
    return socket;
}

/**
 * Get the socket instance
 * @returns {Object} The socket instance
 */
export function getSocket() {
    return socket;
}

/**
 * Get the local player ID
 * @returns {string|null} The local player ID
 */
export function getLocalPlayerId() {
    return localPlayerId;
}

/**
 * Update the user count display
 * @param {number} count - The current user count
 */
function updateUserCount(count) {
    userCount = count;
    const userCountElement = document.getElementById('user-count');
    userCountElement.textContent = `${userCount} ${userCount === 1 ? 'user' : 'users'} online`;
}
