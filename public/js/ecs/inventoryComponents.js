// ECS Inventory Components
// Components for inventory and item functionality

import { Component } from './core.js';

/**
 * Item Component
 * Represents an item that can be picked up and stored in inventory
 */
export class ItemComponent extends Component {
    constructor(data = {}) {
        super({
            uuid: data.uuid || null,
            id: data.id || 0, // Default item ID is 0
            name: data.name || 'Unknown Item', // Item name
            description: data.description || '', // Item description
            isPickupable: data.isPickupable !== undefined ? data.isPickupable : true, // Whether the item can be picked up
            ownerId: data.ownerId || null, // ID of the player who owns this item (null if on ground)
            slotIndex: data.slotIndex !== undefined ? data.slotIndex : -1 // Position in inventory (-1 if not in inventory)
        });
    }
}

/**
 * Inventory Component
 * Stores a player's inventory of items
 */
export class InventoryComponent extends Component {
    constructor(data = {}) {
        super({
            slots: data.slots || Array(28).fill(null), // 28 inventory slots as requested
            maxSlots: data.maxSlots || 28, // Maximum number of slots
            selectedSlot: data.selectedSlot || 0 // Currently selected slot
        });
    }

    /**
     * Add an item to the inventory
     * @param {Object} itemData - The item data to add
     * @returns {number} The slot index where the item was added, or -1 if inventory is full
     */
    addItem(itemData) {
        // Find the first empty slot
        const emptySlotIndex = this.slots.findIndex(slot => slot === null);
        
        // If no empty slot found, inventory is full
        if (emptySlotIndex === -1) {
            return -1;
        }
        
        // Add item to the empty slot
        this.slots[emptySlotIndex] = {
            id: itemData.id,
            name: itemData.name,
            description: itemData.description || ''
        };
        
        return emptySlotIndex;
    }

    /**
     * Remove an item from a specific slot
     * @param {number} slotIndex - The slot index to remove from
     * @returns {Object|null} The removed item data, or null if slot was empty
     */
    removeItem(slotIndex) {
        // Check if slot index is valid
        if (slotIndex < 0 || slotIndex >= this.maxSlots) {
            return null;
        }
        
        // Get the item from the slot
        const item = this.slots[slotIndex];
        
        // If slot is empty, return null
        if (item === null) {
            return null;
        }
        
        // Clear the slot
        this.slots[slotIndex] = null;
        
        // Return the removed item
        return item;
    }

    /**
     * Check if the inventory has space for more items
     * @returns {boolean} True if there is at least one empty slot
     */
    hasSpace() {
        return this.slots.some(slot => slot === null);
    }
}

/**
 * Interactable Component
 * Marks an entity as interactable by the player
 */
export class InteractableComponent extends Component {
    constructor(data = {}) {
        super({
            type: data.type || 'item', // Type of interaction (item, npc, etc.)
            range: data.range || 2.0, // Interaction range in world units
            onInteract: data.onInteract || null // Function to call when interacted with
        });
    }
}
