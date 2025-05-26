// Context Menu System
// Handles right-click context menu interactions with the game world

import { System } from './core.js';
import { getCamera, getScene } from '../three-setup.js';
import { getContextMenuManager } from '../contextMenu.js';
import * as THREE from 'three';
import { requestTrade } from '../trade/index.js';

/**
 * Context Menu System
 * Manages right-click interactions with the game world
 */
export class ContextMenuSystem extends System {
    constructor(socket) {
        super();
        this.requiredComponents = []; // No specific components required
        this.socket = socket;
        
        // Create raycaster for detecting what was clicked
        this.raycaster = new THREE.Raycaster();
        this.clickPosition = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y-up plane at y=0
        this.targetPoint = new THREE.Vector3();
        
        // Get context menu manager
        this.contextMenuManager = getContextMenuManager();
        
        // Listen for context menu requests
        document.addEventListener('context-menu-requested', this.handleContextMenuRequested.bind(this));
    }
    
    /**
     * Handle context menu request event
     * @param {CustomEvent} event - The context menu request event
     */
    handleContextMenuRequested(event) {
        const { x, y, clientX, clientY } = event.detail;
        
        // Get normalized device coordinates
        const rect = event.detail.target.getBoundingClientRect();
        this.clickPosition.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.clickPosition.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        // Cast ray from camera
        this.raycaster.setFromCamera(this.clickPosition, getCamera());
        
        // Check for intersections with objects in the scene
        const scene = getScene();
        const intersects = this.raycaster.intersectObjects(scene.children, true);
        
        console.log('Context menu raycaster found', intersects.length, 'intersections');
        
        // Find what was clicked
        if (intersects.length > 0) {
            // Get the first intersected object
            const intersect = intersects[0];
            const object = intersect.object;
            
            console.log('Intersected object:', object);
            console.log('Object userData:', object.userData);
            
            // Check if object has userData with entity information
            if (object.userData && object.userData.entityId) {
                console.log('Found entityId in userData:', object.userData.entityId);
                // Find the entity in the world
                const entity = this.findEntityByMesh(object);
                
                if (entity) {
                    console.log('Found entity:', entity.id);
                    console.log('Entity has components:', 
                        'MeshComponent:', entity.hasComponent('MeshComponent'),
                        'PlayerComponent:', entity.hasComponent('PlayerComponent'),
                        'ItemComponent:', entity.hasComponent('ItemComponent')
                    );
                    // Check if it's an item
                    if (entity.hasComponent('ItemComponent')) {
                        const itemComponent = entity.getComponent('ItemComponent');
                        
                        // Show context menu for item
                        this.showItemContextMenu(x, y, itemComponent, intersect.point);
                        return;
                    }
                    
                    // Check if it's another player
                    if (entity.hasComponent('PlayerComponent')) {
                        const playerComponent = entity.getComponent('PlayerComponent');
                        
                        // Don't show context menu for local player
                        if (!playerComponent.isLocalPlayer) {
                            // Show context menu for player
                            this.showPlayerContextMenu(x, y, playerComponent, entity, intersect.point);
                            return;
                        }
                    }
                }
            }
        }
        
        // If no specific object was clicked, check for ground plane intersection
        if (this.raycaster.ray.intersectPlane(this.groundPlane, this.targetPoint)) {
            // Show default context menu for ground
            this.showGroundContextMenu(x, y, this.targetPoint);
        }
    }
    
    /**
     * Find entity by its mesh
     * @param {THREE.Object3D} mesh - The mesh to find entity for
     * @returns {Entity|null} The entity or null if not found
     */
    findEntityByMesh(mesh) {
        // First, try to find the entity directly using userData.entityId
        if (mesh.userData && mesh.userData.entityId) {
            const entityId = mesh.userData.entityId;
            const entity = this.world.entities.find(e => e.id === entityId);
            if (entity) {
                console.log('Found entity by userData.entityId:', entityId);
                return entity;
            }
        }
        
        // If that fails, try to find by traversing up the parent chain
        let currentObject = mesh;
        while (currentObject) {
            if (currentObject.userData && currentObject.userData.entityId) {
                const entityId = currentObject.userData.entityId;
                const entity = this.world.entities.find(e => e.id === entityId);
                if (entity) {
                    console.log('Found entity by parent userData.entityId:', entityId);
                    return entity;
                }
            }
            currentObject = currentObject.parent;
        }
        
        // If still not found, try the original method
        for (const entity of this.world.entities) {
            if (entity.hasComponent('MeshComponent')) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh === mesh || meshComponent.mesh.children.includes(mesh)) {
                    console.log('Found entity by direct mesh comparison');
                    return entity;
                }
            }
        }
        
        console.log('Could not find entity for mesh:', mesh);
        return null;
    }
    
    /**
     * Find entity by its ItemComponent
     * @param {ItemComponent} itemComponent - The item component to find entity for
     * @returns {Entity|null} The entity or null if not found
     */
    findEntityByItemComponent(itemComponent) {
        for (const entity of this.world.entities) {
            if (entity.hasComponent('ItemComponent')) {
                const entityItemComponent = entity.getComponent('ItemComponent');
                if (entityItemComponent === itemComponent) {
                    return entity;
                }
            }
        }
        return null;
    }
    
    /**
     * Show context menu for ground
     * @param {number} x - X position for menu
     * @param {number} y - Y position for menu
     * @param {THREE.Vector3} targetPoint - The 3D point that was clicked
     */
    showGroundContextMenu(x, y, targetPoint) {
        const menuItems = [
            {
                label: 'Walk here',
                action: (target) => {
                    // Find local player entity
                    for (const entity of this.world.entities) {
                        if (entity.hasComponent('PlayerComponent') && 
                            entity.hasComponent('MovementComponent')) {
                            
                            const playerComponent = entity.getComponent('PlayerComponent');
                            
                            // Only move the local player
                            if (playerComponent.isLocalPlayer) {
                                const movementComponent = entity.getComponent('MovementComponent');
                                
                                // Set target position (keep y coordinate unchanged)
                                movementComponent.targetPosition.set(
                                    target.x,
                                    0, // Keep at ground level
                                    target.z
                                );
                                movementComponent.isMoving = true;
                                
                                // Emit movement to server
                                if (this.socket) {
                                    this.socket.emit('update position', {
                                        playerId: playerComponent.playerId,
                                        targetPosition: {
                                            x: movementComponent.targetPosition.x,
                                            y: movementComponent.targetPosition.y,
                                            z: movementComponent.targetPosition.z
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            },
            { separator: true },
            {
                label: 'Cancel',
                action: () => {
                    // Do nothing, menu will close automatically
                }
            }
        ];
        
        // Show context menu
        this.contextMenuManager.showMenu(x, y, menuItems, targetPoint);
    }
    
    /**
     * Show context menu for item
     * @param {number} x - X position for menu
     * @param {number} y - Y position for menu
     * @param {ItemComponent} itemComponent - The item component
     * @param {THREE.Vector3} targetPoint - The 3D point that was clicked
     */
    showItemContextMenu(x, y, itemComponent, targetPoint) {
        // Find the item entity by its component
        const itemEntity = this.findEntityByItemComponent(itemComponent);
        if (!itemEntity) {
            console.error('ContextMenuSystem: Could not find entity for item component:', itemComponent);
            return;
        }
        
        const menuItems = [
            {
                label: `Pick up "${itemComponent.name}"`,
                highlight: true,
                action: (target) => {
                    // Find local player entity
                    for (const entity of this.world.entities) {
                        if (entity.hasComponent('PlayerComponent') && 
                            entity.hasComponent('MovementComponent')) {
                            
                            const playerComponent = entity.getComponent('PlayerComponent');
                            
                            // Only move the local player
                            if (playerComponent.isLocalPlayer) {
                                const movementComponent = entity.getComponent('MovementComponent');
                                const playerEntity = entity;
                                
                                // Set target position to item location
                                movementComponent.targetPosition.set(
                                    target.x,
                                    0, // Keep at ground level
                                    target.z
                                );
                                movementComponent.isMoving = true;
                                
                                // Store the item to pick up when we arrive
                                movementComponent.targetItem = itemEntity;
                                
                                // Set up a movement completion listener
                                const originalOnReachTarget = movementComponent.onReachTarget;
                                movementComponent.onReachTarget = () => {
                                    // Call original handler if it exists
                                    if (originalOnReachTarget) {
                                        originalOnReachTarget();
                                    }
                                    
                                    // Check if we're close enough to the item
                                    if (movementComponent.targetItem) {
                                        const itemTransform = movementComponent.targetItem.getComponent('TransformComponent');
                                        const playerTransform = playerEntity.getComponent('TransformComponent');
                                        const interactableComponent = movementComponent.targetItem.getComponent('InteractableComponent');
                                        
                                        if (itemTransform && playerTransform && interactableComponent) {
                                            const distance = playerTransform.position.distanceTo(itemTransform.position);
                                            const pickupRange = interactableComponent.range || 1.5;
                                            
                                            console.log(`ContextMenuSystem: Distance to item: ${distance.toFixed(2)}, Pickup range: ${pickupRange}`);
                                            
                                            if (distance <= pickupRange) {
                                                // We're close enough, trigger the interaction
                                                console.log(`ContextMenuSystem: Player reached item, triggering interaction`);
                                                interactableComponent.onInteract(playerEntity, movementComponent.targetItem);
                                            } else {
                                                console.log(`ContextMenuSystem: Player not close enough to item (${distance.toFixed(2)} units). Must be within ${pickupRange} units.`);
                                            }
                                        }
                                        
                                        // Clear the target item
                                        movementComponent.targetItem = null;
                                    }
                                    
                                    // Restore original handler
                                    movementComponent.onReachTarget = originalOnReachTarget;
                                };
                                
                                // Emit movement to server
                                if (this.socket) {
                                    this.socket.emit('update position', {
                                        playerId: playerComponent.playerId,
                                        targetPosition: {
                                            x: movementComponent.targetPosition.x,
                                            y: movementComponent.targetPosition.y,
                                            z: movementComponent.targetPosition.z
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            },
            {
                label: 'Walk here',
                action: (target) => {
                    // Find local player entity
                    for (const entity of this.world.entities) {
                        if (entity.hasComponent('PlayerComponent') && 
                            entity.hasComponent('MovementComponent')) {
                            
                            const playerComponent = entity.getComponent('PlayerComponent');
                            
                            // Only move the local player
                            if (playerComponent.isLocalPlayer) {
                                const movementComponent = entity.getComponent('MovementComponent');
                                
                                // Set target position (keep y coordinate unchanged)
                                movementComponent.targetPosition.set(
                                    target.x,
                                    0, // Keep at ground level
                                    target.z
                                );
                                movementComponent.isMoving = true;
                                
                                // Emit movement to server
                                if (this.socket) {
                                    this.socket.emit('update position', {
                                        playerId: playerComponent.playerId,
                                        targetPosition: {
                                            x: movementComponent.targetPosition.x,
                                            y: movementComponent.targetPosition.y,
                                            z: movementComponent.targetPosition.z
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            },
            { separator: true },
            {
                label: 'Cancel',
                action: () => {
                    // Do nothing, menu will close automatically
                }
            }
        ];
        
        // Show context menu
        this.contextMenuManager.showMenu(x, y, menuItems, targetPoint);
    }
    
    /**
     * Show context menu for player
     * @param {number} x - X position for menu
     * @param {number} y - Y position for menu
     * @param {PlayerComponent} playerComponent - The player component
     * @param {Entity} playerEntity - The player entity
     * @param {THREE.Vector3} targetPoint - The 3D point that was clicked
     */
    showPlayerContextMenu(x, y, playerComponent, playerEntity, targetPoint) {
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (!localPlayerEntity) {
            console.error('ContextMenuSystem: Could not find local player entity');
            return;
        }
        
        const localPlayerComponent = localPlayerEntity.getComponent('PlayerComponent');
        
        const menuItems = [
            {
                label: `Trade with ${playerComponent.username}`,
                highlight: true,
                action: (target) => {
                    // Initiate trade with this player
                    if (this.socket) {
                        console.log(`Requesting trade with player ${playerComponent.username} (${playerComponent.playerId})`);
                        
                        // Request trade with the player
                        requestTrade({
                            localPlayerId: localPlayerComponent.playerId,
                            localPlayerName: localPlayerComponent.username,
                            remotePlayerId: playerComponent.playerId,
                            remotePlayerName: playerComponent.username,
                            socket: this.socket
                        });
                    }
                }
            },
            {
                label: `Walk to ${playerComponent.username}`,
                action: (target) => {
                    // Find local player entity
                    for (const entity of this.world.entities) {
                        if (entity.hasComponent('PlayerComponent') && 
                            entity.hasComponent('MovementComponent')) {
                            
                            const playerComponent = entity.getComponent('PlayerComponent');
                            
                            // Only move the local player
                            if (playerComponent.isLocalPlayer) {
                                const movementComponent = entity.getComponent('MovementComponent');
                                const targetTransform = playerEntity.getComponent('TransformComponent');
                                
                                if (targetTransform) {
                                    // Set target position near the other player
                                    const targetPos = targetTransform.position.clone();
                                    
                                    // Offset slightly to avoid standing directly on top of them
                                    const offset = new THREE.Vector3(0.5, 0, 0.5);
                                    targetPos.add(offset);
                                    
                                    movementComponent.targetPosition.copy(targetPos);
                                    movementComponent.isMoving = true;
                                    
                                    // Emit movement to server
                                    if (this.socket) {
                                        this.socket.emit('update position', {
                                            playerId: playerComponent.playerId,
                                            targetPosition: {
                                                x: movementComponent.targetPosition.x,
                                                y: movementComponent.targetPosition.y,
                                                z: movementComponent.targetPosition.z
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { separator: true },
            {
                label: 'Cancel',
                action: () => {
                    // Do nothing, menu will close automatically
                }
            }
        ];
        
        // Show context menu
        this.contextMenuManager.showMenu(x, y, menuItems, targetPoint);
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(world, deltaTime) {
        // Store reference to world for use in event handlers
        this.world = world;
    }
}
