// Network functionality using Socket.io
let socket;
let userCount = 0;

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
        updateUserCount(1); // Increment for self
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
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
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
 * Update the user count display
 * @param {number} count - The current user count
 */
function updateUserCount(count) {
    userCount = count;
    const userCountElement = document.getElementById('user-count');
    userCountElement.textContent = `${userCount} ${userCount === 1 ? 'user' : 'users'} online`;
}
