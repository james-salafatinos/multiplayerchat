// ECS Core Implementation
// Provides the fundamental Entity Component System architecture

/**
 * Component Base Class
 * Components are pure data containers
 */
export class Component {
    constructor(data = {}) {
        Object.assign(this, data);
    }
}

/**
 * Entity Class
 * Entities are containers for components
 */
export class Entity {
    constructor() {
        this.id = Entity.nextId++;
        this.components = new Map();
        this.active = true;
    }

    /**
     * Add a component to this entity
     * @param {Component} component - The component to add
     * @returns {Entity} This entity for chaining
     */
    addComponent(component) {
        const componentName = component.constructor.name;
        this.components.set(componentName, component);
        return this;
    }

    /**
     * Remove a component from this entity
     * @param {string} componentName - The name of the component class to remove
     * @returns {Entity} This entity for chaining
     */
    removeComponent(componentName) {
        this.components.delete(componentName);
        return this;
    }

    /**
     * Check if this entity has a component
     * @param {string} componentName - The name of the component class to check
     * @returns {boolean} True if the entity has the component
     */
    hasComponent(componentName) {
        return this.components.has(componentName);
    }

    /**
     * Get a component from this entity
     * @param {string} componentName - The name of the component class to get
     * @returns {Component|null} The component, or null if not found
     */
    getComponent(componentName) {
        return this.components.get(componentName) || null;
    }

    /**
     * Deactivate this entity
     * @param {boolean} cleanup - Whether to clean up resources like meshes
     */
    deactivate(cleanup = true) {
        if (cleanup && this.hasComponent('MeshComponent')) {
            const meshComponent = this.getComponent('MeshComponent');
            if (meshComponent.mesh) {
                // Remove from parent (scene) if it has one
                if (meshComponent.mesh.parent) {
                    meshComponent.mesh.parent.remove(meshComponent.mesh);
                }
                
                // Dispose of geometry and materials to prevent memory leaks
                if (meshComponent.mesh.geometry) {
                    meshComponent.mesh.geometry.dispose();
                }
                
                if (meshComponent.mesh.material) {
                    if (Array.isArray(meshComponent.mesh.material)) {
                        meshComponent.mesh.material.forEach(material => material.dispose());
                    } else {
                        meshComponent.mesh.material.dispose();
                    }
                }
                
                // Mark as removed from scene
                meshComponent.addedToScene = false;
            }
        }
        
        // Mark as inactive
        this.active = false;
    }
}

// Static counter for entity IDs
Entity.nextId = 0;

/**
 * System Base Class
 * Systems contain logic that operates on entities with specific components
 */
export class System {
    constructor() {
        this.requiredComponents = [];
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
        for (const entity of world.entities) {
            if (entity.active && this.matchesEntity(entity)) {
                this.processEntity(entity, deltaTime);
            }
        }
    }
}

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
        
        // Update last update time
        this.lastUpdateTime = currentTime;
    }
}
