/**
 * World Class
 * The world manages entities and systems
 */
export class World {
    constructor() {
        this.entities = [];
        this.systems = [];
        this.lastUpdateTime = 0;
    }

    /**
     * Add an entity to this world
     * @param {Entity} entity - The entity to add
     * @returns {Entity} The added entity
     */
    addEntity(entity) {
        this.entities.push(entity);
        return entity;
    }

    /**
     * Remove an entity from this world
     * @param {Entity} entity - The entity to remove
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }

    /**
     * Register a system with this world
     * @param {System} system - The system to register
     */
    registerSystem(system) {
        this.systems.push(system);
    }

    /**
     * Initialize all systems
     */
    init() {
        // Initialize all systems
        for (const system of this.systems) {
            if (system.init) {
                system.init(this);
            }
        }
    }

    /**
     * Update all systems in this world
     * @param {number} currentTime - Current time in seconds
     */
    update(currentTime) {
        const deltaTime = this.lastUpdateTime === 0 ? 
            0 : currentTime - this.lastUpdateTime;
        
        // Update all systems
        for (const system of this.systems) {
            system.update(this, deltaTime);
        }
        
        // Clean up deactivated entities
        this.entities = this.entities.filter(entity => entity.active);
        
        // Update time
        this.lastUpdateTime = currentTime;
    }

    /**
     * Find entities with a specific component type
     * @param {string} componentName - Component class name to find
     * @returns {Array<Entity>} - Array of entities having that component
     */
    findEntitiesWith(componentName) {
        return this.entities.filter(entity => 
            entity.active && entity.hasComponent(componentName)
        );
    }

    /**
     * Find the first entity with specific component type
     * @param {string} componentName - Component class name to find
     * @returns {Entity|null} - First matching entity or null
     */
    getEntityById(id) {
        return this.entities.find(entity => entity.active && entity.id === id) || null;
    }

    findEntityWith(componentName) {
        return this.entities.find(entity => 
            entity.active && entity.hasComponent(componentName)
        ) || null;
    }
    
    /**
     * Find entities that have all the specified component types
     * @param {Array<Function>} componentTypes - Array of component constructor functions
     * @returns {Array<number>} - Array of entity IDs with all component types
     */
    queryEntities(componentTypes) {
        return this.entities
            .filter(entity => {
                if (!entity.active) return false;
                
                // Check if entity has all required components
                return componentTypes.every(ComponentType => {
                    const componentName = ComponentType.name;
                    return entity.hasComponent(componentName);
                });
            })
            .map(entity => entity.id); // Return array of entity IDs
    }
}
