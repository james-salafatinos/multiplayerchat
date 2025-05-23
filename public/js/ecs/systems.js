// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from './core.js';
import { render } from '../three-setup.js';

/**
 * Render System
 * Handles rendering entities with mesh and transform components
 */
export class RenderSystem extends System {
    constructor(scene) {
        super();
        this.requiredComponents = ['MeshComponent', 'TransformComponent'];
        this.scene = scene;
    }

    /**
     * Initialize the system, adding all meshes to the scene
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        for (const entity of world.entities) {
            if (this.matchesEntity(entity)) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh && !meshComponent.addedToScene) {
                    this.scene.add(meshComponent.mesh);
                    meshComponent.addedToScene = true;
                }
            }
        }
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     */
    processEntity(entity) {
        const meshComponent = entity.getComponent('MeshComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        
        // Skip if no mesh
        if (!meshComponent.mesh) return;
        
        // Add to scene if not already added
        if (!meshComponent.addedToScene) {
            this.scene.add(meshComponent.mesh);
            meshComponent.addedToScene = true;
        }
        
        // Update mesh transform
        meshComponent.mesh.position.copy(transformComponent.position);
        meshComponent.mesh.rotation.copy(transformComponent.rotation);
        meshComponent.mesh.scale.copy(transformComponent.scale);
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     */
    update(world) {
        // Process all matching entities
        super.update(world);
        
        // Render the scene
        render();
    }
}

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
            if (entity.hasComponent('NetworkSyncComponent') && 
                entity.hasComponent('TransformComponent')) {
                
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
