/**
 * System Base Class
 * Systems contain logic that operates on entities with specific components
 */
export class System {
    constructor() {
        this.requiredComponents = [];
        this.world = null;
    }

    /**
     * Check if an entity matches this system's requirements
     * @param {Entity} entity - The entity to check
     * @returns {boolean} True if the entity has all required components
     */
    matchesEntity(entity) {
        return this.requiredComponents.every(componentName => 
            entity.hasComponent(componentName)
        );
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        // Override in derived classes
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(world, deltaTime) {
        this.world = world; // Cache reference to world
        for (const entity of world.entities) {
            if (entity.active && this.matchesEntity(entity)) {
                this.processEntity(entity, deltaTime);
            }
        }
    }

    /**
     * Initialize the system
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        this.world = world;
        // Override in derived classes if needed
    }
}
