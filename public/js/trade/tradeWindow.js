/**
 * Trade Window Module
 * 
 * Handles the creation and management of the trade window UI
 */

import { createTradeSide } from './tradeUI.js';
import { setupTradeEventListeners } from './tradeEvents.js';
import { setupInventoryItemClickHandlers, setupInventoryContextMenu, removeInventoryContextMenu } from './inventoryInteraction.js';
import { showNotification } from './utils.js';
import { updateTradeWindowItems } from './tradeItems.js';

// Initialize global trade state
// This is exported as window.activeTrade for other modules to access
window.activeTrade = null;

/**
 * Show the trade window for a trade between two players
 * @param {Object} options - Trade options
 * @param {string} options.localPlayerId - ID of the local player
 * @param {string} options.localPlayerName - Name of the local player
 * @param {string} options.remotePlayerId - ID of the remote player
 * @param {string} options.remotePlayerName - Name of the remote player
 * @param {Object} options.socket - Socket.io connection
 */
export function showTradeWindow(options) {
    console.log('Showing trade window with options:', options);
    
    // Check if there's already an active trade
    if (window.activeTrade) {
        console.log('Trade window is already open');
        return;
    }
    
    // Set up active trade
    window.activeTrade = {
        localPlayerId: options.localPlayerId,
        localPlayerName: options.localPlayerName,
        remotePlayerId: options.remotePlayerId,
        remotePlayerName: options.remotePlayerName,
        socket: options.socket,
        localItems: [],
        remoteItems: [],
        localAccepted: false,
        remoteAccepted: false,
        status: 'active'
    };
    
    // Create trade window UI
    createTradeWindowUI();
    
    // Set up socket event listeners
    setupTradeEventListeners();
    
    // Set up right-click context menu for inventory items
    setupInventoryContextMenu();
    
    // Make sure the inventory is visible so items can be clicked
    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer) {
        console.log('Making inventory visible for trading');
        inventoryContainer.style.display = 'flex';
        
        // Set up click handlers for inventory items
        // Use setTimeout to ensure the inventory is fully visible
        setTimeout(() => {
            setupInventoryItemClickHandlers();
        }, 100);
    } else {
        console.warn('Inventory container not found!');
    }
    
    // Show a notification to the user about how to trade
    showNotification('Click on items in your inventory to add them to the trade');
}

/**
 * Create the trade window UI
 */
function createTradeWindowUI() {
    // Create the main trade window container
    const tradeWindow = document.createElement('div');
    tradeWindow.id = 'trade-window';
    tradeWindow.className = 'trade-window';
    
    // Apply styles
    Object.assign(tradeWindow.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px',
        height: '400px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: '2000',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
    });

    // Create header
    const header = document.createElement('div');
    header.className = 'trade-header';
    Object.assign(header.style, {
        padding: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    });

    // Create title
    const title = document.createElement('h2');
    title.textContent = `Trading with ${window.activeTrade.remotePlayerName}`;
    title.style.margin = '0';
    title.style.fontSize = '18px';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    Object.assign(closeButton.style, {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer'
    });
    closeButton.addEventListener('click', () => {
        cancelTrade();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    tradeWindow.appendChild(header);

    // Create trade content area
    const content = document.createElement('div');
    content.className = 'trade-content';
    Object.assign(content.style, {
        display: 'flex',
        flex: '1',
        padding: '10px'
    });

    // Create local player side
    const localSide = createTradeSide(window.activeTrade.localPlayerName, 'local');
    
    // Create divider
    const divider = document.createElement('div');
    Object.assign(divider.style, {
        width: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        margin: '0 10px'
    });

    // Create remote player side
    const remoteSide = createTradeSide(window.activeTrade.remotePlayerName, 'remote');

    content.appendChild(localSide);
    content.appendChild(divider);
    content.appendChild(remoteSide);
    tradeWindow.appendChild(content);

    // Create footer with accept/decline buttons
    const footer = document.createElement('div');
    footer.className = 'trade-footer';
    Object.assign(footer.style, {
        padding: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between'
    });

    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.id = 'trade-status';
    statusMessage.textContent = 'Waiting for both players to accept...';
    Object.assign(statusMessage.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.7)'
    });

    // Buttons container
    const buttonsContainer = document.createElement('div');
    Object.assign(buttonsContainer.style, {
        display: 'flex',
        gap: '10px'
    });

    // Decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.id = 'trade-decline';
    Object.assign(declineButton.style, {
        padding: '8px 16px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    declineButton.addEventListener('click', () => {
        cancelTrade();
    });

    // Accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.id = 'trade-accept';
    Object.assign(acceptButton.style, {
        padding: '8px 16px',
        backgroundColor: '#2ecc71',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    acceptButton.addEventListener('click', () => {
        toggleAcceptTrade();
    });

    buttonsContainer.appendChild(declineButton);
    buttonsContainer.appendChild(acceptButton);
    
    footer.appendChild(statusMessage);
    footer.appendChild(buttonsContainer);
    tradeWindow.appendChild(footer);

    // Add to document
    document.body.appendChild(tradeWindow);

    // Update the trade window with inventory items
    updateTradeWindowItems();
}

/**
 * Close the trade window
 */
export function closeTradeWindow() {
    console.log('Closing trade window');
    
    // Remove the trade window from the DOM
    const tradeWindow = document.getElementById('trade-window');
    if (tradeWindow) {
        tradeWindow.remove();
    }
    
    // Remove context menu event listener from inventory items
    removeInventoryContextMenu();
    
    // Clean up socket event listeners
    if (window.activeTrade && window.activeTrade.socket) {
        window.activeTrade.socket.off('trade update');
        window.activeTrade.socket.off('trade accept');
        window.activeTrade.socket.off('trade complete');
        window.activeTrade.socket.off('trade cancel');
    }
    
    // Reset active trade
    window.activeTrade = null;
}

/**
 * Toggle accepting the trade
 */
export function toggleAcceptTrade() {
    // Toggle acceptance state
    window.activeTrade.localAccepted = !window.activeTrade.localAccepted;
    
    // Update UI
    const acceptButton = document.getElementById('trade-accept');
    if (acceptButton) {
        if (window.activeTrade.localAccepted) {
            acceptButton.textContent = 'Cancel Accept';
            acceptButton.style.backgroundColor = '#e67e22';
        } else {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
    }
    
    // Update trade status
    updateTradeStatus();
    
    // Send update to server
    window.activeTrade.socket.emit('trade accept', {
        fromPlayerId: window.activeTrade.localPlayerId,
        toPlayerId: window.activeTrade.remotePlayerId,
        accepted: window.activeTrade.localAccepted
    });
    
    // Check if both players have accepted
    if (window.activeTrade.localAccepted && window.activeTrade.remoteAccepted) {
        // Complete the trade
        completeTrade();
    }
}

/**
 * Update the trade status message
 */
export function updateTradeStatus() {
    const statusElement = document.getElementById('trade-status');
    if (!statusElement) return;
    
    if (window.activeTrade.localAccepted && window.activeTrade.remoteAccepted) {
        statusElement.textContent = 'Trade accepted by both players!';
        statusElement.style.color = '#2ecc71';
    } else if (window.activeTrade.localAccepted) {
        statusElement.textContent = 'Waiting for other player to accept...';
        statusElement.style.color = '#f39c12';
    } else if (window.activeTrade.remoteAccepted) {
        statusElement.textContent = `${window.activeTrade.remotePlayerName} has accepted the trade.`;
        statusElement.style.color = '#f39c12';
    } else {
        statusElement.textContent = 'Waiting for both players to accept...';
        statusElement.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

/**
 * Cancel the trade
 */
export function cancelTrade() {
    // Update status
    window.activeTrade.status = 'cancelled';
    
    // Send cancellation to server
    if (window.activeTrade.socket) {
        window.activeTrade.socket.emit('trade cancel', {
            fromPlayerId: window.activeTrade.localPlayerId,
            toPlayerId: window.activeTrade.remotePlayerId
        });
    }
    
    // Close the trade window
    closeTradeWindow();
}

/**
 * Complete the trade
 */
export function completeTrade() {
    // Update status
    window.activeTrade.status = 'completed';
    
    const statusElement = document.getElementById('trade-status');
    if (statusElement) {
        statusElement.textContent = 'Trade completed successfully!';
        statusElement.style.color = '#2ecc71';
    }
    
    // Disable buttons
    const acceptButton = document.getElementById('trade-accept');
    const declineButton = document.getElementById('trade-decline');
    
    if (acceptButton) {
        acceptButton.disabled = true;
        acceptButton.style.backgroundColor = '#ccc';
        acceptButton.style.cursor = 'default';
    }
    
    if (declineButton) {
        declineButton.textContent = 'Close';
    }
    
    // Find local player entity
    const world = window.gameWorld;
    if (world) {
        const localPlayerEntity = world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (localPlayerEntity && localPlayerEntity.hasComponent('InventoryComponent')) {
            const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
            
            // Process the item exchange locally
            // 1. Remove offered items from local inventory
            window.activeTrade.localItems.forEach(item => {
                // Clear the slot in local inventory
                if (item.inventoryIndex !== undefined && 
                    inventoryComponent.slots[item.inventoryIndex] !== null) {
                    inventoryComponent.slots[item.inventoryIndex] = null;
                }
            });
            
            // 2. Add received items to local inventory
            window.activeTrade.remoteItems.forEach(item => {
                // Find an empty slot to add the received item
                const emptySlotIndex = inventoryComponent.slots.findIndex(slot => slot === null);
                if (emptySlotIndex !== -1) {
                    inventoryComponent.slots[emptySlotIndex] = {
                        id: item.id,
                        name: item.name,
                        description: item.description || ''
                    };
                } else {
                    console.warn('No empty inventory slot for received item:', item.name);
                    // Could show a notification here that inventory is full
                }
            });
            
            // Trigger an inventory update event to refresh the UI
            document.dispatchEvent(new CustomEvent('inventory-display-update'));
        }
    }
    
    // Send completion to server
    window.activeTrade.socket.emit('trade complete', {
        fromPlayerId: window.activeTrade.localPlayerId,
        toPlayerId: window.activeTrade.remotePlayerId,
        localItems: window.activeTrade.localItems,
        remoteItems: window.activeTrade.remoteItems
    });
    
    // Show notification about the trade results
    if (window.activeTrade.localItems.length > 0 && window.activeTrade.remoteItems.length > 0) {
        showNotification(`Exchanged ${window.activeTrade.localItems.length} items for ${window.activeTrade.remoteItems.length} items`);
    } else if (window.activeTrade.localItems.length > 0) {
        showNotification(`Gave ${window.activeTrade.localItems.length} items to ${window.activeTrade.remotePlayerName}`);
    } else if (window.activeTrade.remoteItems.length > 0) {
        showNotification(`Received ${window.activeTrade.remoteItems.length} items from ${window.activeTrade.remotePlayerName}`);
    } else {
        showNotification('Trade completed with no items exchanged');
    }
    
    // Close trade window after a delay
    setTimeout(() => {
        closeTradeWindow();
    }, 2000);
}
