import { Component } from '../core/index.js';



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
