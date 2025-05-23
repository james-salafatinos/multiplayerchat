// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from './core.js';
import { render, getCamera, getRenderer } from '../three-setup.js';
import * as THREE from 'three';

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

/**
 * Movement System
 * Handles moving entities with movement components
 */
export class MovementSystem extends System {
    constructor(socket) {
        super();
        this.requiredComponents = ['MovementComponent', 'TransformComponent'];
        this.socket = socket;
        this.raycaster = new THREE.Raycaster();
        this.clickPosition = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y-up plane at y=0
        this.targetPoint = new THREE.Vector3();
        
        // Listen for remote position updates
        document.addEventListener('remote-position-update', (event) => {
            this.handleRemotePosition(event.detail);
        });
        
        // Set up click handler for local player movement
        const renderer = getRenderer();
        if (renderer) {
            renderer.domElement.addEventListener('click', (event) => {
                this.handleClick(event);
            });
        }
    }
    
    /**
     * Handle click events for player movement
     * @param {MouseEvent} event - The click event
     */
    handleClick(event) {
        console.log('Click event detected');
        
        // Get normalized device coordinates
        const rect = event.target.getBoundingClientRect();
        this.clickPosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.clickPosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        console.log('Click position (normalized):', this.clickPosition);
        
        // Cast ray from camera
        this.raycaster.setFromCamera(this.clickPosition, getCamera());
        
        // Find intersection with ground plane
        if (this.raycaster.ray.intersectPlane(this.groundPlane, this.targetPoint)) {
            console.log('Intersection with ground at:', this.targetPoint);
            
            // Find local player entity
            let foundLocalPlayer = false;
            
            for (const entity of this.world.entities) {
                if (entity.hasComponent('PlayerComponent') && 
                    entity.hasComponent('MovementComponent')) {
                    
                    const playerComponent = entity.getComponent('PlayerComponent');
                    
                    // Only move the local player
                    if (playerComponent.isLocalPlayer) {
                        foundLocalPlayer = true;
                        console.log('Found local player with ID:', playerComponent.playerId);
                        
                        const movementComponent = entity.getComponent('MovementComponent');
                        const transformComponent = entity.getComponent('TransformComponent');
                        
                        console.log('Current position:', transformComponent.position);
                        
                        // Set target position (keep y coordinate unchanged)
                        movementComponent.targetPosition.set(
                            this.targetPoint.x,
                            0, // Keep at ground level
                            this.targetPoint.z
                        );
                        movementComponent.isMoving = true;
                        
                        console.log('Set target position to:', movementComponent.targetPosition);
                        
                        // Emit movement to server
                        if (this.socket) {
                            const updateData = {
                                playerId: playerComponent.playerId,
                                targetPosition: {
                                    x: movementComponent.targetPosition.x,
                                    y: movementComponent.targetPosition.y,
                                    z: movementComponent.targetPosition.z
                                }
                            };
                            
                            console.log('Emitting position update to server:', updateData);
                            this.socket.emit('update position', updateData);
                        } else {
                            console.error('Socket not available for position update');
                        }
                    }
                }
            }
            
            if (!foundLocalPlayer) {
                console.warn('No local player found to move');
            }
        } else {
            console.warn('No intersection with ground plane');
        }
    }
    
    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        const movementComponent = entity.getComponent('MovementComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        const networkComponent = entity.getComponent('NetworkSyncComponent');
        
        // Skip if not moving
        if (!movementComponent.isMoving) return;
        
        // Ensure position is a Vector3 object
        if (!(transformComponent.position instanceof THREE.Vector3)) {
            console.log('Converting position to Vector3:', transformComponent.position);
            transformComponent.position = new THREE.Vector3(
                transformComponent.position.x || 0,
                transformComponent.position.y || 0,
                transformComponent.position.z || 0
            );
        }
        
        // Ensure targetPosition is a Vector3 object
        if (!(movementComponent.targetPosition instanceof THREE.Vector3)) {
            console.log('Converting targetPosition to Vector3:', movementComponent.targetPosition);
            movementComponent.targetPosition = new THREE.Vector3(
                movementComponent.targetPosition.x || 0,
                movementComponent.targetPosition.y || 0,
                movementComponent.targetPosition.z || 0
            );
        }
        
        // Calculate direction and distance to target
        const direction = new THREE.Vector3().subVectors(
            movementComponent.targetPosition,
            transformComponent.position
        );
        const distance = direction.length();
        
        console.log('Moving player:', {
            from: transformComponent.position.clone(),
            to: movementComponent.targetPosition.clone(),
            distance: distance,
            speed: movementComponent.speed,
            deltaTime: deltaTime
        });
        
        // If close enough to target, stop moving
        if (distance < 0.1) {
            movementComponent.isMoving = false;
            console.log('Reached target position');
            return;
        }
        
        // Normalize direction and apply movement speed
        direction.normalize();
        const moveAmount = movementComponent.speed * deltaTime;
        
        // Move towards target, but don't overshoot
        if (moveAmount >= distance) {
            transformComponent.position.copy(movementComponent.targetPosition);
            movementComponent.isMoving = false;
            console.log('Reached target in this step');
        } else {
            const movement = direction.clone().multiplyScalar(moveAmount);
            transformComponent.position.add(movement);
            console.log('Moved by:', movement, 'New position:', transformComponent.position.clone());
        }
        
        // Face movement direction
        if (direction.x !== 0 || direction.z !== 0) {
            transformComponent.rotation.y = Math.atan2(direction.x, direction.z);
        }
        
        // Sync position over network if entity has NetworkSyncComponent
        if (networkComponent && this.socket) {
            movementComponent.lastSyncTime += deltaTime;
            
            // Only sync at specified intervals
            if (movementComponent.lastSyncTime >= movementComponent.syncInterval) {
                const playerComponent = entity.getComponent('PlayerComponent');
                
                // Only send updates for local player
                if (playerComponent && playerComponent.isLocalPlayer) {
                    this.socket.emit('update position', {
                        playerId: playerComponent.playerId,
                        position: {
                            x: transformComponent.position.x,
                            y: transformComponent.position.y,
                            z: transformComponent.position.z
                        },
                        rotation: {
                            y: transformComponent.rotation.y
                        }
                    });
                }
                
                movementComponent.lastSyncTime = 0;
            }
        }
    }
    
    /**
     * Handle remote position updates from other clients
     * @param {Object} data - The position data
     */
    handleRemotePosition(data) {
        console.log('Handling remote position update:', data);
        
        // Find player entity with matching ID
        for (const entity of this.world.entities) {
            if (entity.hasComponent('PlayerComponent') && 
                entity.hasComponent('TransformComponent') &&
                entity.hasComponent('MovementComponent')) {
                
                const playerComponent = entity.getComponent('PlayerComponent');
                
                // Skip local player
                if (playerComponent.isLocalPlayer) continue;
                
                // Update remote player if ID matches
                if (playerComponent.playerId === data.playerId) {
                    console.log('Found matching remote player:', playerComponent.playerId);
                    
                    const movementComponent = entity.getComponent('MovementComponent');
                    const transformComponent = entity.getComponent('TransformComponent');
                    
                    // Ensure position is a Vector3 object
                    if (!(transformComponent.position instanceof THREE.Vector3)) {
                        console.log('Converting remote position to Vector3');
                        transformComponent.position = new THREE.Vector3(
                            transformComponent.position.x || 0,
                            transformComponent.position.y || 0,
                            transformComponent.position.z || 0
                        );
                    }
                    
                    // Ensure targetPosition is a Vector3 object
                    if (!(movementComponent.targetPosition instanceof THREE.Vector3)) {
                        console.log('Converting remote targetPosition to Vector3');
                        movementComponent.targetPosition = new THREE.Vector3(
                            movementComponent.targetPosition.x || 0,
                            movementComponent.targetPosition.y || 0,
                            movementComponent.targetPosition.z || 0
                        );
                    }
                    
                    // If target position is provided, update movement target
                    if (data.targetPosition) {
                        console.log('Setting remote target position:', data.targetPosition);
                        movementComponent.targetPosition.set(
                            data.targetPosition.x || 0,
                            data.targetPosition.y || 0,
                            data.targetPosition.z || 0
                        );
                        movementComponent.isMoving = true;
                    }
                    
                    // If current position is provided, update position directly
                    if (data.position) {
                        console.log('Setting remote position directly:', data.position);
                        transformComponent.position.set(
                            data.position.x || 0,
                            data.position.y || 0,
                            data.position.z || 0
                        );
                    }
                    
                    // If rotation is provided, update rotation
                    if (data.rotation) {
                        console.log('Setting remote rotation:', data.rotation);
                        transformComponent.rotation.y = data.rotation.y || 0;
                    }
                }
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
