
import { Component } from '../core/index.js';

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
