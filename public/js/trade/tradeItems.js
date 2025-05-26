/**
 * Trade Items Module
 * 
 * Handles the management of items in the trade window
 */

import { createOfferedItemSlot, createEmptyOfferedSlot } from './tradeUI.js';
import { updateTradeStatus } from './tradeWindow.js';
import { setupInventoryItemClickHandlers } from './inventoryInteraction.js';
import { showItemInInventory, hideItemInInventory } from './inventoryInteraction.js';

/**
 * Update the trade window with offered items
 */
export function updateTradeWindowItems() {
    // Update offered items
    updateOfferedItems();
    
    // Set up click handlers for inventory items
    setupInventoryItemClickHandlers();
}

/**
 * Update the offered items in the trade window
 */
export function updateOfferedItems() {
    const localOfferedGrid = document.querySelector('.local-offered-items');
    const remoteOfferedGrid = document.querySelector('.remote-offered-items');
    
    if (!localOfferedGrid || !remoteOfferedGrid) return;

    // Clear existing offered items
    localOfferedGrid.innerHTML = '';
    remoteOfferedGrid.innerHTML = '';

    // Add local offered items
    window.activeTrade.localItems.forEach((item, index) => {
        const itemSlot = createOfferedItemSlot(item, index, 'local');
        localOfferedGrid.appendChild(itemSlot);
    });

    // Add remote offered items
    window.activeTrade.remoteItems.forEach((item, index) => {
        const itemSlot = createOfferedItemSlot(item, index, 'remote');
        remoteOfferedGrid.appendChild(itemSlot);
    });

    // Fill remaining slots with empty slots
    const maxOfferedItems = 8; // 2 rows of 4 items
    
    for (let i = window.activeTrade.localItems.length; i < maxOfferedItems; i++) {
        const emptySlot = createEmptyOfferedSlot();
        localOfferedGrid.appendChild(emptySlot);
    }
    
    for (let i = window.activeTrade.remoteItems.length; i < maxOfferedItems; i++) {
        const emptySlot = createEmptyOfferedSlot();
        remoteOfferedGrid.appendChild(emptySlot);
    }

    // Update trade status
    updateTradeStatus();
}

/**
 * Offer an item for trade
 * @param {number} inventoryIndex - Index of the item in the inventory
 * @param {Object} item - The item to offer
 */
export function offerItem(inventoryIndex, item) {
    // Check if trade is still in a state where we can modify offers
    if (window.activeTrade.localAccepted || window.activeTrade.remoteAccepted) {
        // Reset acceptance if items change
        window.activeTrade.localAccepted = false;
        window.activeTrade.remoteAccepted = false;
        
        // Update UI to reflect this
        const acceptButton = document.getElementById('trade-accept');
        if (acceptButton) {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
        
        // Notify the other player that we've modified our offer
        window.activeTrade.socket.emit('trade modify', {
            fromPlayerId: window.activeTrade.localPlayerId,
            toPlayerId: window.activeTrade.remotePlayerId
        });
    }
    
    // Check if item is already offered
    const alreadyOfferedIndex = window.activeTrade.localItems.findIndex(offeredItem => 
        offeredItem.inventoryIndex === inventoryIndex
    );
    
    if (alreadyOfferedIndex !== -1) {
        // Item is already offered, remove it
        removeOfferedItem(alreadyOfferedIndex);
        return;
    }
    
    // Add item to offered items with its inventory index
    window.activeTrade.localItems.push({
        ...item,
        inventoryIndex: inventoryIndex
    });
    
    // Update the UI
    updateOfferedItems();
    
    // Send update to server
    window.activeTrade.socket.emit('trade update', {
        fromPlayerId: window.activeTrade.localPlayerId,
        toPlayerId: window.activeTrade.remotePlayerId,
        offeredItems: window.activeTrade.localItems
    });
}

/**
 * Remove an offered item
 * @param {number} index - Index of the item in the offered items array
 */
export function removeOfferedItem(index) {
    // Check if trade is still in a state where we can modify offers
    if (window.activeTrade.localAccepted || window.activeTrade.remoteAccepted) {
        // Reset acceptance if items change
        window.activeTrade.localAccepted = false;
        window.activeTrade.remoteAccepted = false;
        
        // Update UI to reflect this
        const acceptButton = document.getElementById('trade-accept');
        if (acceptButton) {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
        
        // Notify the other player that we've modified our offer
        window.activeTrade.socket.emit('trade modify', {
            fromPlayerId: window.activeTrade.localPlayerId,
            toPlayerId: window.activeTrade.remotePlayerId
        });
    }
    
    // Get the inventory index before removing the item
    const inventoryIndex = window.activeTrade.localItems[index].inventoryIndex;
    
    // Remove item from offered items
    window.activeTrade.localItems.splice(index, 1);
    
    // Show item back in inventory
    showItemInInventory(inventoryIndex);
    
    // Update the UI
    updateOfferedItems();
    
    // Send update to server
    window.activeTrade.socket.emit('trade update', {
        fromPlayerId: window.activeTrade.localPlayerId,
        toPlayerId: window.activeTrade.remotePlayerId,
        offeredItems: window.activeTrade.localItems
    });
}
