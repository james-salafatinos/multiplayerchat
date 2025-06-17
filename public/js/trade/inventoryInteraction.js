/**
 * Inventory Interaction Module
 * 
 * Handles interactions between the trade system and the player's inventory
 */

import { offerItem, removeOfferedItem } from './tradeItems.js';

/**
 * Set up click handlers for inventory items during trade
 */
export function setupInventoryItemClickHandlers() {
    console.log('Setting up inventory item click handlers for trade');
    
    // Find all inventory slots in the game UI
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    console.log(`Found ${inventorySlots.length} inventory slots`);
    
    if (inventorySlots.length === 0) {
        console.warn('No inventory slots found! Make sure inventory is visible');
        // Try again after a short delay to ensure inventory is loaded
        setTimeout(() => {
            const retrySlots = document.querySelectorAll('.inventory-slot');
            console.log(`Retry: Found ${retrySlots.length} inventory slots`);
            
            retrySlots.forEach(slot => {
                slot.removeEventListener('click', handleInventoryItemClick);
                slot.addEventListener('click', handleInventoryItemClick);
                // Add a visual indicator that the slot is clickable for trading
                slot.classList.add('trade-enabled');
                // Add a simple style to highlight trade-enabled slots
                if (!document.getElementById('trade-slot-styles')) {
                    const style = document.createElement('style');
                    style.id = 'trade-slot-styles';
                    style.textContent = '.trade-enabled { box-shadow: 0 0 3px 1px rgba(46, 204, 113, 0.5); }';
                    document.head.appendChild(style);
                }
            });
        }, 500);
    }
    
    inventorySlots.forEach((slot, index) => {
        console.log(`Setting up click handler for slot ${index}`);
        // Remove any existing click handler first to prevent duplicates
        slot.removeEventListener('click', handleInventoryItemClick);
        // Add new click handler
        slot.addEventListener('click', handleInventoryItemClick);
        // Add a visual indicator that the slot is clickable for trading
        slot.classList.add('trade-enabled');
        // Add a simple style to highlight trade-enabled slots
        if (!document.getElementById('trade-slot-styles')) {
            const style = document.createElement('style');
            style.id = 'trade-slot-styles';
            style.textContent = '.trade-enabled { box-shadow: 0 0 3px 1px rgba(46, 204, 113, 0.5); }';
            document.head.appendChild(style);
        }
    });
}

/**
 * Handle clicks on inventory items during trade
 * @param {MouseEvent} event - The click event
 */
export function handleInventoryItemClick(event) {
    // Only process if trade window is active
    if (!window.activeTrade) {
        console.log('No active trade, ignoring inventory click');
        return;
    }
    
    const slot = event.currentTarget;
    const slotIndex = parseInt(slot.dataset.slotIndex);
    console.log('Inventory slot clicked:', slotIndex);
    
    // Find local player entity to get inventory
    // Try different ways to access the world
    let world = window.gameWorld;
    if (!world) {
        console.log('Trying to find world through window.world');
        world = window.world;
    }
    
    if (!world) {
        console.error('Cannot access game world, trying direct inventory access');
        // Try to access inventory items directly from the slot
        const itemElement = slot.querySelector('.inventory-item');
        if (itemElement) {
            // Extract basic item info from the element
            const itemName = itemElement.getAttribute('data-name') || 'Unknown Item';
            const itemId = parseInt(itemElement.getAttribute('data-id') || '0');
            const itemDesc = itemElement.getAttribute('data-description') || '';
            
            const mockItem = {
                id: itemId,
                name: itemName,
                description: itemDesc
            };
            
            // Check if this item is already offered
            const alreadyOffered = window.activeTrade.localItems.some(offeredItem => 
                offeredItem.inventoryIndex === slotIndex
            );
            
            if (alreadyOffered) {
                // Find the index of the offered item
                const offeredIndex = window.activeTrade.localItems.findIndex(offeredItem => 
                    offeredItem.inventoryIndex === slotIndex
                );
                
                // Remove from offered items
                removeOfferedItem(offeredIndex);
                
                // Show item back in inventory
                showItemInInventory(slotIndex);
            } else {
                // Add to offered items
                offerItem(slotIndex, mockItem);
                
                // Hide item from inventory
                hideItemInInventory(slotIndex);
            }
            return;
        } else {
            console.error('No item found in this slot');
            return;
        }
    }
    
    const localPlayerEntity = world.entities.find(entity => 
        entity.active && 
        entity.hasComponent('PlayerComponent') && 
        entity.getComponent('PlayerComponent').isLocalPlayer
    );
    
    if (!localPlayerEntity) {
        console.error('Local player entity not found');
        return;
    }
    
    // Get the item from the inventory
    const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
    if (!inventoryComponent) {
        console.error('Inventory component not found on player');
        return;
    }
    
    const item = inventoryComponent.slots[slotIndex];
    
    // If slot is empty, do nothing
    if (!item) {
        console.log('Empty slot clicked');
        return;
    }
    
    console.log('Found item in inventory:', item);
    
    // Check if this item is already offered
    const alreadyOffered = window.activeTrade.localItems.some(offeredItem => 
        offeredItem.inventoryIndex === slotIndex
    );
    
    if (alreadyOffered) {
        console.log('Item already offered, removing from trade');
        // Find the index of the offered item
        const offeredIndex = window.activeTrade.localItems.findIndex(offeredItem => 
            offeredItem.inventoryIndex === slotIndex
        );
        
        // Remove from offered items
        removeOfferedItem(offeredIndex);
        
        // Show item back in inventory
        showItemInInventory(slotIndex);
    } else {
        console.log('Adding item to trade offer');
        // Add to offered items
        offerItem(slotIndex, item);
        
        // Hide item from inventory
        hideItemInInventory(slotIndex);
    }
}

/**
 * Hide an item in the inventory (visually) when it's added to trade
 * @param {number} slotIndex - Index of the slot in inventory
 */
export function hideItemInInventory(slotIndex) {
    const slot = document.querySelector(`.inventory-slot[data-slot-index="${slotIndex}"]`);
    if (!slot) return;
    
    // Find the item display within the slot
    const itemDisplay = slot.querySelector('.inventory-item');
    if (itemDisplay) {
        // Add a 'traded' class and reduce opacity
        itemDisplay.classList.add('traded');
        itemDisplay.style.opacity = '0.3';
    }
}

/**
 * Show an item back in the inventory when removed from trade
 * @param {number} slotIndex - Index of the slot in inventory
 */
export function showItemInInventory(slotIndex) {
    const slot = document.querySelector(`.inventory-slot[data-slot-index="${slotIndex}"]`);
    if (!slot) return;
    
    // Find the item display within the slot
    const itemDisplay = slot.querySelector('.inventory-item');
    if (itemDisplay) {
        // Remove 'traded' class and restore opacity
        itemDisplay.classList.remove('traded');
        itemDisplay.style.opacity = '1';
    }
}

/**
 * Set up right-click context menu for inventory items
 */
export function setupInventoryContextMenu() {
    // Find all inventory slots in the game UI (not in the trade window)
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    
    inventorySlots.forEach(slot => {
        // Add contextmenu event listener to each slot
        slot.addEventListener('contextmenu', handleInventoryContextMenu);
    });
}

/**
 * Remove context menu event listeners when trade is closed
 */
export function removeInventoryContextMenu() {
    // Find all inventory slots
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    
    // Remove both click and context menu event listeners
    inventorySlots.forEach(slot => {
        // Remove the contextmenu event listener
        slot.removeEventListener('contextmenu', handleInventoryContextMenu);
        // Also remove the click handler
        slot.removeEventListener('click', handleInventoryItemClick);
        
        // Reset any visual changes from trading
        const itemDisplay = slot.querySelector('.inventory-item');
        if (itemDisplay && itemDisplay.classList.contains('traded')) {
            itemDisplay.classList.remove('traded');
            itemDisplay.style.opacity = '1';
        }
    });
    
    // Remove any existing context menus
    const existingMenu = document.getElementById('inventory-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

/**
 * Handle right-click context menu on inventory items
 * @param {MouseEvent} event - The context menu event
 */
export function handleInventoryContextMenu(event) {
    // Prevent the default context menu
    event.preventDefault();

    // Get the slot index from the clicked element
    const slotElement = event.currentTarget;
    const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);

    // Find the item display element within the slot
    const itemDisplay = slotElement.querySelector('.inventory-item');

    // If there's no item display in this slot, don't show the menu
    if (!itemDisplay) return;

    // Get item data from the dataset attributes
    console.log('Raw dataset attributes:', itemDisplay.dataset);
    
    // Extract all attributes from dataset with detailed logging
    const itemId = itemDisplay.dataset.id;
    const itemName = itemDisplay.dataset.name;
    const itemDesc = itemDisplay.dataset.description;
    const itemUseType = itemDisplay.dataset.useType;
    
    console.log('Extracted item data:', {
        id: itemId,
        name: itemName,
        description: itemDesc,
        useType: itemUseType
    });
    
    const item = {
        id: itemId,
        name: itemName,
        description: itemDesc,
        useType: itemUseType || 'Use'
    };
    
    console.log('Final context menu item object:', item);

    // If there's no item in this slot, don't show the menu
    if (!item) return;

    // Remove any existing context menu
    const existingMenu = document.getElementById('inventory-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'inventory-context-menu';
    Object.assign(contextMenu.style, {
        position: 'fixed',
        top: `${event.clientY}px`,
        left: `${event.clientX}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        padding: '5px',
        zIndex: '3000',
        color: 'white',
        fontSize: '14px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
    });
    
    // Check if we're in an active trade
    if (window.activeTrade && window.activeTrade.status === 'active') {
        // Create menu item for adding to trade
        const addToTradeOption = document.createElement('div');
        addToTradeOption.textContent = 'Add to Trade';
        Object.assign(addToTradeOption.style, {
            padding: '5px 10px',
            cursor: 'pointer',
            borderRadius: '2px'
        });
        
        // Highlight on hover
        addToTradeOption.addEventListener('mouseover', () => {
            addToTradeOption.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        addToTradeOption.addEventListener('mouseout', () => {
            addToTradeOption.style.backgroundColor = 'transparent';
        });
        
        // Add click handler to offer the item
        addToTradeOption.addEventListener('click', () => {
            offerItem(slotIndex, item);
            contextMenu.remove();
        });
        
        contextMenu.appendChild(addToTradeOption);
    }
    
    // Add item use option based on useType
    const useOption = document.createElement('div');
    // Determine the action text based on item's useType property
    const useAction = item.useType || 'Use'; // Default to "Use" if useType is not specified
    useOption.textContent = useAction;
    
    Object.assign(useOption.style, {
        padding: '5px 10px',
        cursor: 'pointer',
        borderRadius: '2px'
    });
    
    // Highlight on hover
    useOption.addEventListener('mouseover', () => {
        useOption.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    useOption.addEventListener('mouseout', () => {
        useOption.style.backgroundColor = 'transparent';
    });
    
    // Add click handler to use the item
    useOption.addEventListener('click', () => {
        useItem(slotIndex, item);
        contextMenu.remove();
    });
    
    contextMenu.appendChild(useOption);
    
    // Add a Cancel option (always present)
    const cancelOption = document.createElement('div');
    cancelOption.textContent = 'Cancel';
    Object.assign(cancelOption.style, {
        padding: '5px 10px',
        cursor: 'pointer',
        borderRadius: '2px'
    });
    
    // Highlight on hover
    cancelOption.addEventListener('mouseover', () => {
        cancelOption.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    cancelOption.addEventListener('mouseout', () => {
        cancelOption.style.backgroundColor = 'transparent';
    });
    
    // Add click handler to close the menu
    cancelOption.addEventListener('click', () => {
        contextMenu.remove();
    });
    
    contextMenu.appendChild(cancelOption);
    document.body.appendChild(contextMenu);
    
    // Prevent the Three.js world context menu
    window.suppressWorldContextMenu = true;
    
    // Close menu when clicking elsewhere
    const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeContextMenu);
            window.suppressWorldContextMenu = false;
        }
    };
    
    // Add a small delay before adding the click listener to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 10);
}

/**
 * Use an item from the inventory
 * @param {number} slotIndex - Index of the slot in inventory
 * @param {Object} item - The item to use
 */
export function useItem(slotIndex, item) {
    console.log(`Using item: ${item.name} from slot ${slotIndex}`);
    
    // Get the action based on useType
    const action = item.useType || 'Use';
    
    // Show a message about using the item
    const message = `${action}ing ${item.name}...`;
    showItemUseMessage(message);
    
    // If connected to server, send item use event
    const socket = window.socket;
    if (socket) {
        socket.emit('use item', {
            slotIndex: slotIndex,
            itemId: item.id
        });
    }
}

/**
 * Display a message when using an item
 * @param {string} message - The message to display
 */
function showItemUseMessage(message) {
    // Check if a status message container exists
    let statusContainer = document.getElementById('status-message-container');
    
    // If not, create one
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.id = 'status-message-container';
        Object.assign(statusContainer.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '5px',
            fontSize: '16px',
            zIndex: '2000',
            textAlign: 'center',
            transition: 'opacity 0.3s ease',
            opacity: '0'
        });
        document.body.appendChild(statusContainer);
    }
    
    // Set the message
    statusContainer.textContent = message;
    statusContainer.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusContainer.style.opacity = '0';
        setTimeout(() => {
            if (statusContainer.parentNode) {
                statusContainer.parentNode.removeChild(statusContainer);
            }
        }, 300);
    }, 3000);
}

// Initialize the inventory context menu on page load
document.addEventListener('DOMContentLoaded', () => {
    setupInventoryContextMenu();
});
