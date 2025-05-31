// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from '../core/index.js';
import { getCamera, getRenderer } from '../../three-setup.js';
import * as THREE from 'three';


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
        
        // Set up click and drag handlers for player movement and camera control
        const renderer = getRenderer();
        if (renderer) {
            // Track mouse state for differentiating between clicks and drags
            this.mouseDown = false;
            this.mouseMoved = false;
            this.mouseDownTime = 0;
            this.mouseDownPos = { x: 0, y: 0 };
            
            // Mouse down - start tracking for potential click (left click only)
            renderer.domElement.addEventListener('mousedown', (event) => {
                // Only track left mouse button (button 0)
                if (event.button === 0) {
                    this.mouseDown = true;
                    this.mouseMoved = false;
                    this.mouseDownTime = performance.now();
                    this.mouseDownPos = { x: event.clientX, y: event.clientY };
                }
            });
            
            // Mouse move - track if user is dragging
            renderer.domElement.addEventListener('mousemove', (event) => {
                if (this.mouseDown) {
                    // Calculate distance moved from mouse down position
                    const dx = Math.abs(event.clientX - this.mouseDownPos.x);
                    const dy = Math.abs(event.clientY - this.mouseDownPos.y);
                    
                    // If moved more than threshold, consider it a drag (for camera rotation)
                    if (dx > 5 || dy > 5) {
                        this.mouseMoved = true;
                    }
                }
            });
            
            // Mouse up - if it was a left click (not a drag), handle player movement
            renderer.domElement.addEventListener('mouseup', (event) => {
                // Only handle left mouse button (button 0)
                if (event.button === 0) {
                    // Only handle as a click if:
                    // 1. Mouse was down
                    // 2. Mouse didn't move significantly (not a drag)
                    // 3. Click duration was short enough
                    const clickDuration = performance.now() - this.mouseDownTime;
                    
                    if (this.mouseDown && !this.mouseMoved && clickDuration < 300) {
                        this.handleClick(event);
                    }
                    
                    // Reset mouse state
                    this.mouseDown = false;
                    this.mouseMoved = false;
                }
            });
            
            // Handle touch events for mobile
            let touchStartTime = 0;
            let touchStartPos = { x: 0, y: 0 };
            let touchMoved = false;
            
            renderer.domElement.addEventListener('touchstart', (event) => {
                if (event.touches.length === 1) {
                    touchStartTime = performance.now();
                    touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
                    touchMoved = false;
                }
            });
            
            renderer.domElement.addEventListener('touchmove', (event) => {
                if (event.touches.length === 1) {
                    const dx = Math.abs(event.touches[0].clientX - touchStartPos.x);
                    const dy = Math.abs(event.touches[0].clientY - touchStartPos.y);
                    
                    if (dx > 10 || dy > 10) {
                        touchMoved = true;
                    }
                }
            });
            
            renderer.domElement.addEventListener('touchend', (event) => {
                const touchDuration = performance.now() - touchStartTime;
                
                if (!touchMoved && touchDuration < 300) {
                    // Convert touch to simulated click event
                    const simulatedEvent = {
                        clientX: touchStartPos.x,
                        clientY: touchStartPos.y,
                        target: event.target
                    };
                    this.handleClick(simulatedEvent);
                }
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
            
            // Call onReachTarget callback if it exists
            if (typeof movementComponent.onReachTarget === 'function') {
                console.log('Calling onReachTarget callback');
                movementComponent.onReachTarget();
            }
            
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
