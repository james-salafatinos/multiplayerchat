// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from '../core/index.js';



/**
 * Rotation System
 * Handles rotating entities with rotation components
 */
export class RotationSystem extends System {
    constructor(socket) {
        super();
        this.requiredComponents = ['RotationComponent', 'TransformComponent'];
        this.socket = socket;
        
        // Listen for remote rotation updates
        document.addEventListener('remote-rotation-update', (event) => {
            this.handleRemoteRotation(event.detail);
        });
    }

    /**
     * Check if an entity matches this system's requirements
     * @param {Entity} entity - The entity to check
     * @returns {boolean} True if the entity has all required components and is not a player
     */
    matchesEntity(entity) {
        // Skip player entities
        if (entity.hasComponent('PlayerComponent')) {
            return false;
        }
        
        // Use the standard component matching
        return super.matchesEntity(entity);
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        const rotationComponent = entity.getComponent('RotationComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        const networkComponent = entity.getComponent('NetworkSyncComponent');
        
        // Update rotation based on speed
        transformComponent.rotation.x += rotationComponent.speed.x * deltaTime;
        transformComponent.rotation.y += rotationComponent.speed.y * deltaTime;
        transformComponent.rotation.z += rotationComponent.speed.z * deltaTime;
        
        // Sync rotation over network if entity has NetworkSyncComponent
        if (networkComponent && this.socket) {
            rotationComponent.lastSyncTime += deltaTime;
            
            // Only sync at specified intervals
            if (rotationComponent.lastSyncTime >= rotationComponent.syncInterval) {
                this.socket.emit('update rotation', {
                    x: transformComponent.rotation.x,
                    y: transformComponent.rotation.y,
                    z: transformComponent.rotation.z
                });
                
                rotationComponent.lastSyncTime = 0;
            }
        }
    }
    
    /**
     * Handle remote rotation updates from other clients
     * @param {Object} rotation - The rotation data
     */
    handleRemoteRotation(rotation) {
        // Find entities with NetworkSyncComponent and update their rotation
        for (const entity of this.world.entities) {
            // Skip player entities - they should only rotate based on movement direction
            if (entity.hasComponent('PlayerComponent')) {
                continue;
            }
            
            if (entity.hasComponent('NetworkSyncComponent') && 
                entity.hasComponent('TransformComponent') &&
                entity.hasComponent('RotationComponent')) { // Only apply to entities with RotationComponent
                
                const transformComponent = entity.getComponent('TransformComponent');
                
                // Apply received rotation
                transformComponent.rotation.set(
                    rotation.x,
                    rotation.y,
                    rotation.z
                );
            }
        }
    }
    
    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(world, deltaTime) {
        // Store reference to world for use in event handlers
        this.world = world;
        
        // Process all matching entities
        super.update(world, deltaTime);
    }
}
