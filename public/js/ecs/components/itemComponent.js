
import { Component } from '../core/index.js';
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
