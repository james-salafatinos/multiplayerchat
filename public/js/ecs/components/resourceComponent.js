// resourceComponent.js
// Component for resource entities like rocks and trees

/**
 * Component for resources that can be mined/chopped
 */
export class ResourceComponent {
    /**
     * Create a new resource component
     * @param {Object} config - Configuration for this resource
     * @param {string} config.type - Type of resource (rock, tree)
     * @param {string} config.state - Current state ('available', 'depleted')
     * @param {number} config.respawnTime - Time when resource will respawn if depleted
     * @param {string} config.yieldItemId - ID of item this resource yields when harvested
     * @param {number} config.yieldAmount - Amount of items yielded per harvest
     * @param {number} config.harvestTime - Time in ms it takes to harvest this resource
     */
    constructor(config = {}) {
        this.type = config.type || 'rock'; // 'rock', 'tree'
        this.state = config.state || 'available'; // 'available', 'depleted'
        this.respawnTime = config.respawnTime || 0; // Time when resource will respawn
        this.yieldItemId = config.yieldItemId || 'stone'; // Item ID this resource yields
        this.yieldAmount = config.yieldAmount || 1; // How many items per harvest
        this.harvestTime = config.harvestTime || 2000; // Milliseconds to harvest
        
        // Visual properties for client rendering
        this.visualState = config.visualState || 'normal'; // 'normal', 'depleting', 'depleted'
        this.progressPercent = 0; // For progress display
    }
    
    /**
     * Serialize the component for network transmission
     * @returns {Object} Serialized data
     */
    serialize() {
        return {
            type: this.type,
            state: this.state,
            respawnTime: this.respawnTime,
            yieldItemId: this.yieldItemId,
            yieldAmount: this.yieldAmount,
            harvestTime: this.harvestTime,
            visualState: this.visualState,
            progressPercent: this.progressPercent
        };
    }
    
    /**
     * Create component from serialized data
     * @param {Object} data - Serialized component data
     * @returns {ResourceComponent} New component instance
     */
    static deserialize(data) {
        return new ResourceComponent(data);
    }
}

// Register component for serialization
if (typeof window !== 'undefined' && window.registerComponent) {
    window.registerComponent('ResourceComponent', ResourceComponent);
}
