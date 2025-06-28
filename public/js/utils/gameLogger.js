// Game Action Logger Module
// Provides utilities for logging game actions to the chat system

/**
 * Game action logger class
 * Handles logging of various game events to the chat interface
 */
class GameLogger {
    constructor() {
        this.socket = null;
        this.localPlayerId = null;
        this.playerName = null;
        this.isInitialized = false;
        this.messageQueue = [];
        console.log('GameLogger instance created');
    }

    /**
     * Initialize the game logger with a socket and player info
     * @param {Object} socket - The socket.io instance
     * @param {string} playerId - The local player ID
     * @param {string} playerName - The player's username
     */
    init(socket, playerId, playerName) {
        // Wait a bit before initializing to ensure socket is ready
        setTimeout(() => {
            this.socket = socket;
            this.localPlayerId = playerId;
            this.playerName = playerName;
            this.isInitialized = true;
            console.log('Game Logger initialized for player:', playerName);
            
            // Process any queued messages
            this.processQueue();
        }, 500);  // Short delay to ensure socket is ready
    }
    
    /**
     * Process any messages that were queued before initialization
     */
    processQueue() {
        console.log(`Processing ${this.messageQueue.length} queued log messages`);
        
        if (this.messageQueue.length > 0) {
            this.messageQueue.forEach(message => {
                const { method, args } = message;
                this[method](...args);
            });
            
            // Clear the queue
            this.messageQueue = [];
        }
    }

    /**
     * Log a game action
     * @param {string} actionType - The type of action (movement, resource, trade, etc)
     * @param {string} content - The content of the game action message
     * @param {Object} options - Additional options
     */
    log(actionType, content, options = {}) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'log',
                args: [actionType, content, options]
            });
            console.log('Logger not initialized. Queueing message:', actionType, content);
            return;
        }

        // Now we can be confident we're initialized
        const actionData = {
            actionType,
            content,
            playerId: options.playerId || this.localPlayerId,
            playerName: options.playerName || this.playerName,
            timestamp: new Date().toISOString(),
            ...options
        };

        try {
            this.socket.emit('log game action', actionData);
        } catch (err) {
            console.warn('Error sending log action:', err);
        }
    }
    
    /**
     * Safely log - checks initialization first
     * @param {string} actionType - The type of action
     * @param {string} content - The content of the message
     * @param {Object} options - Additional options
     */
    safeLog(actionType, content, options = {}) {
        try {
            this.log(actionType, content, options);
        } catch (error) {
            console.warn('Error in gameLogger.log:', error);
            // Add to queue for later processing
            if (!this.isInitialized) {
                this.messageQueue.push({
                    method: 'log',
                    args: [actionType, content, options]
                });
            }
        }
    }

    /**
     * Log a player movement action
     * @param {Object} position - The position coordinates
     * @param {Object} options - Additional options
     */
    logPlayerMovement(position, options = {}) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'logPlayerMovement',
                args: [position, options]
            });
            return;
        }
        
        const { x, y, z } = position;
        const formatCoord = (coord) => Math.round(coord * 10) / 10; // Round to 1 decimal place
        
        this.log(
            'Movement',
            `${options.playerName || this.playerName} moving to position (${formatCoord(x)}, ${formatCoord(y)}, ${formatCoord(z)})`,
            options
        );
    }
    
    /**
     * Log a resource gathering action
     * @param {string} resourceType - Type of resource being gathered
     * @param {string} action - The action being performed (mining, chopping, etc)
     * @param {Object} options - Additional options
     */
    logResourceAction(resourceType, action, options = {}) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'logResourceAction',
                args: [resourceType, action, options]
            });
            return;
        }
        
        this.log(
            'Resource',
            `${options.playerName || this.playerName} ${action} ${resourceType}`,
            options
        );
    }
    
    /**
     * Log a resource item received
     * @param {string} itemName - Name of the item received
     * @param {number} quantity - Quantity received (default 1)
     * @param {Object} options - Additional options
     */
    logItemReceived(itemName, quantity = 1, options = {}) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'logItemReceived',
                args: [itemName, quantity, options]
            });
            return;
        }
        
        const quantityText = quantity > 1 ? `${quantity}x ` : '';
        
        this.log(
            'Item',
            `${options.playerName || this.playerName} received ${quantityText}${itemName}`,
            options
        );
    }
    
    /**
     * Log a trade action
     * @param {string} action - The trade action (request, accept, decline)
     * @param {string} targetPlayerName - The other player involved in the trade
     * @param {Object} options - Additional options
     */
    logTradeAction(action, targetPlayerName, options = {}) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'logTradeAction',
                args: [action, targetPlayerName, options]
            });
            return;
        }
        
        this.log(
            'Trade',
            `${options.playerName || this.playerName} ${action} trade with ${targetPlayerName}`,
            options
        );
    }
    
    /**
     * Log a server event
     * @param {string} eventType - Type of server event
     * @param {string} content - Event content
     */
    logServerEvent(eventType, content) {
        // If not initialized, queue the message for later
        if (!this.isInitialized) {
            this.messageQueue.push({
                method: 'logServerEvent',
                args: [eventType, content]
            });
            return;
        }
        
        this.log(
            eventType,
            content,
            { isServerEvent: true }
        );
    }
}

// Create and export a singleton instance
const gameLogger = new GameLogger();
export default gameLogger;
