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
