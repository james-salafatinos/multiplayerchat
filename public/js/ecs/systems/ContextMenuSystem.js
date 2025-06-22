// Context Menu System
// Handles right-click context menu interactions with the game world

import { System } from '../core/index.js';
import { getCamera, getScene } from '../../three-setup.js';
import { getContextMenuManager } from '../../contextMenu.js';
import * as THREE from 'three';
import { requestTrade } from '../../trade/index.js';
import Logger from '../../utils/logger.js';

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
        
        Logger.info(Logger.LogCategories.SYSTEM, 'ContextMenuSystem', 'Initialized');
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
        
        Logger.debug(Logger.LogCategories.INPUT, 'ContextMenuSystem', `Raycaster found ${intersects.length} intersections`);
        
        // Find what was clicked
        let objectHandled = false;
        
        if (intersects.length > 0) {
            // Get the first intersected object
            const intersect = intersects[0];
            const object = intersect.object;
            
            Logger.debug(Logger.LogCategories.INPUT, 'ContextMenuSystem', 'Intersected object', { 
                name: object.name,
                type: object.type
            });
            
            // Check if object has userData with entity information
            if (object.userData && object.userData.entityId) {
                Logger.debug(Logger.LogCategories.ENTITY, 'ContextMenuSystem', `Found entityId in userData: ${object.userData.entityId}`);
                
                // Find the entity in the world
                const entity = this.findEntityByMesh(object);
                
                if (entity) {
                    Logger.debug(Logger.LogCategories.ENTITY, 'ContextMenuSystem', `Found entity: ${entity.id}`, {
                        hasMeshComponent: entity.hasComponent('MeshComponent'),
                        hasPlayerComponent: entity.hasComponent('PlayerComponent'),
                        hasItemComponent: entity.hasComponent('ItemComponent')
                    });
                    
                    // Check if it's an item
                    if (entity.hasComponent('ItemComponent')) {
                        const itemComponent = entity.getComponent('ItemComponent');
                        
                        // Show context menu for item
                        this.showItemContextMenu(x, y, itemComponent, intersect.point);
                        objectHandled = true;
                        return;
                    }
                    
                    // Check if it's another player
                    if (entity.hasComponent('PlayerComponent')) {
                        const playerComponent = entity.getComponent('PlayerComponent');
                        
                        // Don't show context menu for local player
                        if (!playerComponent.isLocalPlayer) {
                            // Show context menu for player
                            this.showPlayerContextMenu(x, y, playerComponent, entity, intersect.point);
                            objectHandled = true;
                            return;
                        }
                    }
                    
                    // Check if it's an interactable object (tree, rock, etc.)
                    if (entity.hasComponent('InteractableComponent')) {
                        const interactableComponent = entity.getComponent('InteractableComponent');
                        
                        // Show context menu for interactable object
                        this.showInteractableContextMenu(x, y, interactableComponent, entity, intersect.point);
                        objectHandled = true;
                        return;
                    }
                }
            }
        }
        
        // If no specific object was clicked, check for ground plane intersection
        if (!objectHandled && this.raycaster.ray.intersectPlane(this.groundPlane, this.targetPoint)) {
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
                Logger.trace(Logger.LogCategories.ENTITY, 'ContextMenuSystem', `Found entity by userData.entityId: ${entityId}`);
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
                    Logger.trace(Logger.LogCategories.ENTITY, 'ContextMenuSystem', `Found entity by parent userData.entityId: ${entityId}`);
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
                    Logger.trace(Logger.LogCategories.ENTITY, 'ContextMenuSystem', 'Found entity by direct mesh comparison');
                    return entity;
                }
            }
        }
        
        Logger.debug(Logger.LogCategories.ENTITY, 'ContextMenuSystem', 'Could not find entity for mesh', { meshName: mesh.name });
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
            Logger.error(Logger.LogCategories.ENTITY, 'ContextMenuSystem', 'Could not find entity for item component', { 
                itemName: itemComponent.name, 
                itemType: itemComponent.type 
            });
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
                                            
                                            Logger.debug(Logger.LogCategories.PLAYER, 'ContextMenuSystem', `Distance to item: ${distance.toFixed(2)}, Pickup range: ${pickupRange}`);
                                            
                                            if (distance <= pickupRange) {
                                                // We're close enough, trigger the interaction
                                                Logger.debug(Logger.LogCategories.PLAYER, 'ContextMenuSystem', 'Player reached item, triggering interaction');
                                                interactableComponent.onInteract(playerEntity, movementComponent.targetItem);
                                            } else {
                                                Logger.warn(Logger.LogCategories.PLAYER, 'ContextMenuSystem', `Player not close enough to item (${distance.toFixed(2)} units)`, {
                                                    requiredRange: pickupRange
                                                });
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
    /**
     * Show context menu for interactable objects (trees, rocks, etc.)
     * @param {number} x - X position for menu
     * @param {number} y - Y position for menu
     * @param {InteractableComponent} interactableComponent - The interactable component
     * @param {Entity} entity - The interactable entity
     * @param {THREE.Vector3} targetPoint - The 3D point that was clicked
     */
    showInteractableContextMenu(x, y, interactableComponent, entity, targetPoint) {
        console.log('Showing interactable context menu for:', interactableComponent.type);
        console.log('Available actions:', interactableComponent.actions);
        
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (!localPlayerEntity) {
            console.error('Could not find local player entity');
            return;
        }
        
        // Create menu items from interactable actions
        const menuItems = [];
        
        // Add all actions from the interactable component (if any)
        if (interactableComponent.actions && Array.isArray(interactableComponent.actions)) {
            for (const action of interactableComponent.actions) {

                
                menuItems.push({
                    label: action.name,
                    action: (target) => {
                        // Get player components
                        const playerComponent = localPlayerEntity.getComponent('PlayerComponent');
                        const movementComponent = localPlayerEntity.getComponent('MovementComponent');
                        
                        if (!movementComponent) {
                            console.error('Local player has no movement component');
                            return;
                        }
                    
                        // Set target position to the object's position
                        if (entity.hasComponent('TransformComponent')) {
                            const transformComponent = entity.getComponent('TransformComponent');
                            const position = transformComponent.position.clone();
                            
                            // Move slightly away from the object for better positioning
                            const playerPos = localPlayerEntity.getComponent('TransformComponent').position;
                            const direction = new THREE.Vector3().subVectors(playerPos, position).normalize();
                            position.add(direction.multiplyScalar(1.5)); // Stand 1.5 units away
                        
                            // Set movement target
                            movementComponent.targetPosition.copy(position);
                            movementComponent.isMoving = true;
                            
                            // Store the target entity and action for when we reach it
                            movementComponent.targetEntity = entity;
                            movementComponent.targetAction = action.handler;
                            
                            // Save original onReachTarget handler
                            const originalOnReachTarget = movementComponent.onReachTarget;
                            
                            // Set custom onReachTarget handler
                            movementComponent.onReachTarget = () => {
                                console.log(`Player reached ${interactableComponent.type}, executing ${action.handler}`);
                                
                                // Execute the appropriate handler based on the action
                                switch (action.handler) {
                                    case 'examineObject':
                                        // Display a message about the object
                                        console.log(`Examining ${interactableComponent.type}`);
                                        // You would typically show a UI message here
                                        break;
                                        
                                    case 'chopTree':
                                        console.log('Chopping tree');
                                        // Implement woodcutting logic
                                        break;
                                        
                                    case 'mineRock':
                                        console.log('Mining rock');
                                        // Implement mining logic
                                        break;
                                        
                                    default:
                                        console.log(`Unknown action handler: ${action.handler}`);
                                }
                                
                                // Clear target entity and action
                                movementComponent.targetEntity = null;
                                movementComponent.targetAction = null;
                                
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
                });
            }
        }
        
        // Only add the 'Walk here' option if this isn't already a ground interactable
        // (ground interactables already have a 'Walk here' action defined in their actions array)
        if (interactableComponent.type !== 'ground') {
            // Add walk here option
            menuItems.push({ separator: true });
            menuItems.push({
                label: 'Walk here',
                action: (target) => {
                    // Get player components
                    const playerComponent = localPlayerEntity.getComponent('PlayerComponent');
                    const movementComponent = localPlayerEntity.getComponent('MovementComponent');
                    
                    if (!movementComponent) {
                        console.error('Local player has no movement component');
                        return;
                    }
                    
                    // Set target position
                    movementComponent.targetPosition.copy(target);
                    movementComponent.targetPosition.y = 0; // Keep at ground level
                    movementComponent.isMoving = true;
                    
                    // Clear any target entity/action
                    movementComponent.targetEntity = null;
                    movementComponent.targetAction = null;
                    
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
            });
        }
        
        // Add cancel option
        menuItems.push({ separator: true });
        menuItems.push({
            label: 'Cancel',
            action: () => {
                // Do nothing, menu will close automatically
            }
        });
        
        // Show the context menu
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
