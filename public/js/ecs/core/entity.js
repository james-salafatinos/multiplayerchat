import * as THREE from 'three';

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
