// ECS Inventory System
// Handles inventory management and item interactions

import { System } from './core.js';
import * as THREE from 'three';
import { getCamera, getRenderer } from '../three-setup.js';
import { InventoryComponent } from './inventoryComponents.js';

/**
 * Inventory System
 * Manages player inventories and item interactions
 */
export class InventorySystem extends System {
    constructor(socket) {
        super();
        this.requiredComponents = ['PlayerComponent'];
        this.socket = socket;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.itemEntities = []; // Cache of item entities for faster lookup
        this.itemEntitiesByUuid = new Map(); // Map of item entities by UUID
        this.isItemBeingPickedUp = false; // Lock to prevent duplicate pickup attempts
        
        // Set up click handler for item interaction
        const renderer = getRenderer();
        if (renderer) {
            renderer.domElement.addEventListener('click', (event) => {
                this.handleClick(event);
            });
        }
        
        // Listen for inventory display updates to refresh UI
        document.addEventListener('inventory-display-update', () => {
            console.log('[InventorySystem] Received inventory-display-update event.');
            if (!this.world) {
                console.warn('[InventorySystem] inventory-display-update: this.world is not yet available.');
                this.isItemBeingPickedUp = false; // Still release lock if world isn't ready, to prevent permanent lock
                return;
            }

            const localPlayerEntity = this.world.entities.find(entity => 
                entity.active && 
                entity.hasComponent('PlayerComponent') && 
                entity.getComponent('PlayerComponent').isLocalPlayer
            );

            if (localPlayerEntity && localPlayerEntity.hasComponent('InventoryComponent')) {
                const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
                console.log('[InventorySystem] inventory-display-update: Found local player, inventory slots:', JSON.stringify(inventoryComponent.slots));
                this.updateInventoryUI(inventoryComponent);
                
                // Make sure inventory panel is visible after an update
                const inventoryContainer = document.getElementById('inventory-container');
                if (inventoryContainer) {
                    inventoryContainer.classList.remove('hidden');
                }
            } else {
                console.warn('[InventorySystem] inventory-display-update: Local player or InventoryComponent not found.');
            }
            this.isItemBeingPickedUp = false; // Release lock after UI update or if player not found
        });
        
        // Listen for socket events directly
        if (this.socket) {
            this.socket.on('pickup failure', (data) => {
                console.log('Pickup failure:', data.message);
                this.showStatusMessage(data.message || `Item was already picked up.`);
                this.isItemBeingPickedUp = false;
            });
            
            // Listen for inventory updates from server
            this.socket.on('inventory update', (data) => {
                console.log('[InventorySystem] Received inventory update from server:', data);
                
                // Find local player entity
                if (!this.world) {
                    console.warn('[InventorySystem] inventory update: this.world is not yet available.');
                    window.pendingInventory = data.inventory; // Store for later application
                    this.isItemBeingPickedUp = false;
                    return;
                }
                
                const localPlayerEntity = this.world.entities.find(entity => 
                    entity.active && 
                    entity.hasComponent('PlayerComponent') && 
                    entity.getComponent('PlayerComponent').isLocalPlayer
                );
                
                if (localPlayerEntity && localPlayerEntity.hasComponent('InventoryComponent')) {
                    // Update inventory component with new data
                    const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
                    
                    // Handle different formats of inventory update
                    if (data.inventory) {
                        // Full inventory update
                        console.log('[InventorySystem] Updating full inventory:', data.inventory);
                        inventoryComponent.slots = data.inventory;
                    } else if (data.action) {
                        // Action-based update (handled by handleInventoryUpdate)
                        console.log('[InventorySystem] Handling action-based update:', data.action);
                        this.handleInventoryUpdate({
                            playerId: localPlayerEntity.getComponent('PlayerComponent').playerId,
                            action: data.action,
                            slotIndex: data.slotIndex,
                            itemId: data.item ? data.item.id : null,
                            itemName: data.item ? data.item.name : null,
                            itemDescription: data.item ? data.item.description : null,
                            // Include all additional properties from the item definition
                            inventoryIconPath: data.item ? data.item.inventoryIconPath : null,
                            gltfPath: data.item ? data.item.gltfPath : null,
                            tradeable: data.item ? data.item.tradeable : true,
                            stackable: data.item ? data.item.stackable : false,
                            maxStack: data.item ? data.item.maxStack : 1,
                            type: data.item ? data.item.type : 'generic'
                        });
                    } else if (data.item) {
                        // Direct item pickup update
                        console.log('[InventorySystem] Processing direct item pickup:', data.item);
                        // Find first empty slot
                        const emptySlotIndex = inventoryComponent.slots.findIndex(slot => !slot);
                        if (emptySlotIndex !== -1) {
                            inventoryComponent.slots[emptySlotIndex] = data.item;
                        } else {
                            console.warn('[InventorySystem] No empty slot found for item:', data.item.name);
                        }
                    }
                    
                    // Update UI
                    this.updateInventoryUI(inventoryComponent);
                    
                    // Show status message if provided
                    if (data.message) {
                        this.showStatusMessage(data.message);
                    }
                    
                    // Dispatch event for other systems
                    document.dispatchEvent(new CustomEvent('local-inventory-changed', {
                        detail: {
                            inventory: inventoryComponent.slots,
                            item: data.item,
                            message: data.message
                        }
                    }));
                } else {
                    console.warn('[InventorySystem] inventory update: Local player or InventoryComponent not found.');
                    window.pendingInventory = data.inventory; // Store for later application
                }
                
                this.isItemBeingPickedUp = false;
            });
        }
        
        // Set up inventory UI
        this.setupInventoryUI();
    }
    
    /**
     * Initialize the system
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        this.world = world;
        
        // Find all item entities
        this.updateItemEntitiesCache();
    }
    
    /**
     * Update the cache of item entities
     */
    updateItemEntitiesCache() {
        this.itemEntities = this.world.entities.filter(entity => 
            entity.active && entity.hasComponent('ItemComponent') && !entity.hasComponent('PlayerComponent')
        );
        
        // Update UUID map
        this.itemEntitiesByUuid.clear();
        for (const entity of this.itemEntities) {
            const itemComponent = entity.getComponent('ItemComponent');
            if (itemComponent.uuid) {
                this.itemEntitiesByUuid.set(itemComponent.uuid, entity);
            }
        }
    }
    
    /**
     * Handle click events for item interaction
     * @param {MouseEvent} event - The click event
     */
    handleClick(event) {
        // Ignore clicks if we're already processing a pickup
        if (this.isItemBeingPickedUp) {
            console.log('InventorySystem: Pickup attempt ignored: another pickup is in progress.');
            return;
        }
        
        // Ignore clicks on UI elements
        if (event.target.closest('#inventory-container') || 
            event.target.closest('#inventory-toggle')) {
            return;
        }
        
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (!localPlayerEntity) return;
        
        // Get normalized device coordinates
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Cast ray from camera
        this.raycaster.setFromCamera(this.mouse, getCamera());
        
        // Get a list of all entities that have an ItemComponent and a MeshComponent
        const itemEntities = this.world.entities.filter(entity => 
            entity.active && 
            entity.hasComponent('ItemComponent') && 
            entity.hasComponent('MeshComponent')
        );
        const itemMeshes = itemEntities.map(entity => entity.getComponent('MeshComponent').mesh).filter(mesh => mesh);

        if (itemMeshes.length === 0) {
            // console.log('InventorySystem: No item meshes found in the world to intersect with.');
            return;
        }
        
        // Find intersections with item meshes
        const itemIntersections = this.raycaster.intersectObjects(itemMeshes, true); // true for recursive
        
        console.log(`InventorySystem: Raycaster found ${itemIntersections.length} intersections with item meshes.`);

        if (!localPlayerEntity) {
            console.error('InventorySystem: Local player entity not found.');
            return;
        }
        
        // Sort intersections by distance
        itemIntersections.sort((a, b) => a.distance - b.distance);
        
        // If we have an intersection with an item, try to interact with it
        if (itemIntersections.length > 0) {
            const closestIntersection = itemIntersections[0];
            const intersectedMesh = closestIntersection.object;
            console.log('InventorySystem: Closest intersected mesh:', intersectedMesh.name, intersectedMesh.uuid);

            // Find the entity associated with this mesh using userData
            const entityId = intersectedMesh.userData.entityId;
            if (!entityId) {
                console.error('InventorySystem: Intersected mesh is missing userData.entityId.');
                // Fallback or alternative search if needed, though userData is preferred
                const altEntity = itemEntities.find(e => 
                    e.hasComponent('MeshComponent') && 
                    e.getComponent('MeshComponent').mesh === intersectedMesh
                );
                if (altEntity) {
                    console.warn('InventorySystem: Found entity via direct mesh comparison (fallback). Consider ensuring userData.entityId is always set.');
                    // closestItemEntity = altEntity; // Uncomment if you want to use this fallback
                } else {
                    console.error('InventorySystem: Could not find entity for intersected mesh even with fallback.');
                    return;
                }
                // For now, strictly require userData.entityId
                return; 
            }

            const closestItemEntity = this.world.entities.find(e => e.id === entityId);

            if (!closestItemEntity) {
                console.error(`InventorySystem: Could not find entity with ID '${entityId}' from mesh userData.`);
                return;
            }
            console.log('InventorySystem: Found entity for mesh via userData.entityId:', closestItemEntity.id);

            const itemTransform = closestItemEntity.getComponent('TransformComponent');
            const playerTransform = localPlayerEntity.getComponent('TransformComponent');
            const interactableComponent = closestItemEntity.getComponent('InteractableComponent');
            const itemComponent = closestItemEntity.getComponent('ItemComponent');

            if (!interactableComponent) {
                console.error('InventorySystem: Intersected item is missing InteractableComponent. UUID:', itemComponent.uuid);
                return;
            }
            if (!itemComponent) {
                console.error('InventorySystem: Intersected item is missing ItemComponent.');
                return;
            }
            if (!playerTransform) {
                console.error('InventorySystem: Local player is missing TransformComponent.');
                return;
            }
            if (!itemTransform) {
                console.error('InventorySystem: Intersected item is missing TransformComponent. UUID:', itemComponent.uuid);
                return;
            }

            console.log(`InventorySystem: Attempting interaction with ${itemComponent.name} (UUID: ${itemComponent.uuid})`);

            // Check range before attempting interaction
            const distance = playerTransform.position.distanceTo(itemTransform.position);
            const pickupRange = interactableComponent.range || 1.5;
            console.log(`InventorySystem: Distance to item: ${distance.toFixed(2)}, Pickup range: ${pickupRange}`);

            if (distance > pickupRange) {
                console.log(`InventorySystem: Too far from item (${distance.toFixed(2)} units). Must be within ${pickupRange} units.`);
                this.showStatusMessage(`Too far to pick up ${itemComponent.name}. Move closer.`);
                return;
            }

            if (interactableComponent.onInteract) {
                console.log(`InventorySystem: Calling onInteract for item: ${itemComponent.name} (UUID: ${itemComponent.uuid})`);
                this.isItemBeingPickedUp = true; // Set lock before calling onInteract
                interactableComponent.onInteract(localPlayerEntity, closestItemEntity);
            } else {
                console.warn('InventorySystem: Item is interactable but has no onInteract function. UUID:', itemComponent.uuid);
            }
        } else {
            // console.log('InventorySystem: No item intersections found on click.');
        }
    }
    
    /**
     * Pick up an item and add it to the player's inventory
     * @param {Entity} playerEntity - The player entity
     * @param {Entity} itemEntity - The item entity to pick up
     */
    // This method is now largely superseded by InteractableComponent.onInteract
    // Kept for reference or if other local pre-checks are needed in future.
    // pickupItem(playerEntity, itemEntity) {
        // // Set pickup lock to prevent duplicate attempts
        // this.isItemBeingPickedUp = true;
        
        // // Ensure player has an inventory component
        // if (!playerEntity.hasComponent('InventoryComponent')) {
        //     console.error('Player entity does not have an InventoryComponent');
        //     this.isItemBeingPickedUp = false;
        //     return;
        // }
        
        // // Get player and item components
        // const playerComponent = playerEntity.getComponent('PlayerComponent');
        // const playerTransform = playerEntity.getComponent('TransformComponent');
        // const itemTransform = itemEntity.getComponent('TransformComponent');
        // const inventoryComponent = playerEntity.getComponent('InventoryComponent');
        // const itemComponent = itemEntity.getComponent('ItemComponent');

        // // Check if item is pickupable
        // if (!itemComponent.isPickupable) {
        //     console.log(`Item ${itemComponent.name} cannot be picked up`);
        //     this.showStatusMessage(`${itemComponent.name} cannot be picked up`);
        //     this.isItemBeingPickedUp = false;
        //     return;
        // }
        
        // // Check if player is close enough to the item (1 step away = ~1 unit)
        // const distance = playerTransform.position.distanceTo(itemTransform.position);
        // const pickupRange = 1.5; // 1.5 units is about 1 step away
        
        // if (distance > pickupRange) {
        //     console.log(`Too far from item (${distance.toFixed(2)} units). Must be within ${pickupRange} units.`);
        //     this.showStatusMessage(`Too far from item. Move closer.`);
        //     this.isItemBeingPickedUp = false; // Release lock
        //     return;
        // }

        // // Call the onInteract function from InteractableComponent (which now sends to server)
        // const interactableComponent = itemEntity.getComponent('InteractableComponent');
        // if (interactableComponent && interactableComponent.onInteract) {
        //     interactableComponent.onInteract(playerEntity, itemEntity);
        // } else {
        //     console.error('No onInteract function found for item.');
        //     this.isItemBeingPickedUp = false; // Release lock if no action can be taken
        // }
    // }

    /**
     * Handle world item removal event
     * @param {Object} data - The removal data
     */
    handleWorldItemRemoval(data) {
        console.log('Handling world item removal:', data);
        
        if (!data || !data.itemUuid) {
            console.error('Invalid removal data received');
            return;
        }
        
        // Find the item entity by UUID
        const itemEntity = this.itemEntitiesByUuid.get(data.itemUuid);
        
        if (itemEntity) {
            console.log(`Removing item entity with UUID: ${data.itemUuid}`);
            
            // Remove the entity from the world
            this.world.removeEntity(itemEntity);
            
            // Remove from our caches
            this.itemEntitiesByUuid.delete(data.itemUuid);
            this.itemEntities = this.itemEntities.filter(entity => 
                entity !== itemEntity
            );
            
            // If we were the one picking up this item, release the lock
            if (this.isItemBeingPickedUp) {
                this.isItemBeingPickedUp = false;
            }
        } else {
            console.warn(`Item entity with UUID ${data.itemUuid} not found in the world`);
        }
    }
    
    /**
     * Handle world item addition event
     * @param {Object} data - The item data
     */
    handleWorldItemAddition(data) {
        console.log('Handling world item addition:', data);
        
        // Check if item already exists (this can happen in certain edge cases)
        if (this.itemEntitiesByUuid.has(data.uuid)) {
            console.warn(`Item with UUID ${data.uuid} already exists, updating it`);
            const existingEntity = this.itemEntitiesByUuid.get(data.uuid);
            
            // Update position
            if (existingEntity.hasComponent('TransformComponent') && data.position) {
                const transform = existingEntity.getComponent('TransformComponent');
                transform.position.copy(data.position);
            }
            
            // Make sure it's visible
            if (existingEntity.hasComponent('MeshComponent')) {
                const meshComponent = existingEntity.getComponent('MeshComponent');
                if (meshComponent.mesh) {
                    meshComponent.mesh.visible = true;
                }
            }
            
            return;
        }
        
        // Create a new item entity from the data
        import('./inventoryEntities.js').then(module => {
            const { createBasicItem } = module;
            createBasicItem(this.world, data);
            
            // Update our caches
            this.updateItemEntitiesCache();
        });
    }
    
    /**
     * Handle inventory update from server
     * @param {Object} data - The update data
     */
    handleInventoryUpdate(data) {
        console.log('Handling inventory update:', data);
        
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (!localPlayerEntity) {
            console.error('Local player entity not found');
            return;
        }
        
        // Check if this update is for the local player
        const playerComponent = localPlayerEntity.getComponent('PlayerComponent');
        if (playerComponent.id !== data.playerId) {
            // This update is for another player, we can ignore it
            return;
        }
        
        // Get the inventory component
        if (!localPlayerEntity.hasComponent('InventoryComponent')) {
            console.error('Local player entity does not have an InventoryComponent');
            return;
        }
        
        const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
        
        // Handle different actions
        switch (data.action) {
            case 'pickup':
                // Add item to inventory slot
                inventoryComponent.slots[data.slotIndex] = {
                    id: data.itemId,
                    name: data.itemName,
                    description: data.itemDescription || ''
                };
                
                // Show success message
                this.showStatusMessage(`Picked up ${data.itemName}`);
                
                // Release pickup lock
                this.isItemBeingPickedUp = false;
                
                break;
                
            case 'drop':
                // Item will be added to the world via 'add world item' event
                // Just clear the inventory slot
                inventoryComponent.slots[data.slotIndex] = null;
                
                // Show message
                this.showStatusMessage(`Dropped item`);
                break;
                
            case 'move':
                // Move items between slots
                const sourceItem = inventoryComponent.slots[data.sourceSlotIndex];
                const targetItem = inventoryComponent.slots[data.targetSlotIndex];
                
                inventoryComponent.slots[data.targetSlotIndex] = sourceItem;
                inventoryComponent.slots[data.sourceSlotIndex] = targetItem;
                break;
        }
        
        // Update UI
        this.updateInventoryUI(inventoryComponent);
    }
    
    /**
     * Get the scene from the render system
     * @returns {THREE.Scene|null} The scene or null if not found
     */
    getScene() {
        if (!this.world) return null;
        
        // Find the render system
        for (const system of this.world.systems) {
            if (system.constructor.name === 'RenderSystem') {
                return system.scene;
            }
        }
        
        return null;
    }
    
    /**
     * Handle inventory updates from the server
     * @param {Object} data - The inventory update data
     */
    handleInventoryUpdate(data) {
        console.log('Received inventory update:', data);
        
        // Find player entity with matching ID
        const playerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').playerId === data.playerId
        );
        
        if (!playerEntity) {
            console.error(`Player entity with ID ${data.playerId} not found`);
            return;
        }
        
        // Ensure player has an inventory component
        if (!playerEntity.hasComponent('InventoryComponent')) {
            console.error('Player entity does not have an InventoryComponent');
            return;
        }
        
        const inventoryComponent = playerEntity.getComponent('InventoryComponent');
        const playerComponent = playerEntity.getComponent('PlayerComponent');
        const isLocalPlayer = playerComponent.isLocalPlayer;
        
        // Handle different actions
        switch (data.action) {
            case 'pickup':
                // Add item to inventory with all properties
                inventoryComponent.slots[data.slotIndex] = {
                    id: data.itemId,
                    name: data.itemName,
                    description: data.itemDescription || '',
                    // Include additional properties from the item definition
                    inventoryIconPath: data.inventoryIconPath,
                    gltfPath: data.gltfPath,
                    tradeable: data.tradeable,
                    stackable: data.stackable,
                    maxStack: data.maxStack,
                    type: data.type,
                    quantity: data.quantity || 1
                };
                
                if (isLocalPlayer) {
                    this.showStatusMessage(`Picked up ${data.itemName}`);
                }
                break;
                
            case 'drop':
                // Remove item from inventory
                inventoryComponent.slots[data.slotIndex] = null;
                
                if (isLocalPlayer) {
                    this.showStatusMessage(`Dropped item`);
                }
                break;
                
            case 'move':
                // Move item between slots
                const sourceItem = inventoryComponent.slots[data.sourceSlotIndex];
                const targetItem = inventoryComponent.slots[data.targetSlotIndex];
                
                inventoryComponent.slots[data.targetSlotIndex] = sourceItem;
                inventoryComponent.slots[data.sourceSlotIndex] = targetItem;
                break;
                
            case 'sync':
                // Full inventory sync
                inventoryComponent.slots = data.slots;
                break;
        }
        
        // Update UI if this is the local player
        if (isLocalPlayer) {
            this.updateInventoryUI(inventoryComponent);
        }
    }
    
    /**
     * Set up the inventory UI
     */
    setupInventoryUI() {
        // Create inventory container if it doesn't exist
        let inventoryContainer = document.getElementById('inventory-container');
        
        if (!inventoryContainer) {
            inventoryContainer = document.createElement('div');
            inventoryContainer.id = 'inventory-container';
            inventoryContainer.style.position = 'absolute';
            inventoryContainer.style.bottom = '10px';
            inventoryContainer.style.left = '50%';
            inventoryContainer.style.transform = 'translateX(-50%)';
            inventoryContainer.style.width = '500px';
            inventoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            inventoryContainer.style.borderRadius = '5px';
            inventoryContainer.style.padding = '10px';
            inventoryContainer.style.display = 'flex';
            inventoryContainer.style.flexWrap = 'wrap';
            inventoryContainer.style.justifyContent = 'center';
            inventoryContainer.style.gap = '5px';
            inventoryContainer.style.zIndex = '1000';
            
            document.body.appendChild(inventoryContainer);
            
            // Create inventory slots
            for (let i = 0; i < 28; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.dataset.slotIndex = i;
                slot.style.width = '40px';
                slot.style.height = '40px';
                slot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                slot.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                slot.style.borderRadius = '3px';
                slot.style.display = 'flex';
                slot.style.justifyContent = 'center';
                slot.style.alignItems = 'center';
                slot.style.fontSize = '10px';
                slot.style.color = 'white';
                slot.style.overflow = 'hidden';
                slot.style.cursor = 'pointer';
                
                // Make slots droppable
                this.makeSlotDroppable(slot);
                
                inventoryContainer.appendChild(slot);
            }
            
            // Add toggle button for inventory
            const toggleButton = document.createElement('button');
            toggleButton.id = 'inventory-toggle';
            toggleButton.textContent = 'Inventory';
            toggleButton.style.position = 'absolute';
            toggleButton.style.bottom = '10px';
            toggleButton.style.right = '10px';
            toggleButton.style.padding = '5px 10px';
            toggleButton.style.backgroundColor = '#3498db';
            toggleButton.style.color = 'white';
            toggleButton.style.border = 'none';
            toggleButton.style.borderRadius = '3px';
            toggleButton.style.cursor = 'pointer';
            toggleButton.style.zIndex = '1001';
            
            toggleButton.addEventListener('click', () => {
                if (inventoryContainer.style.display === 'none') {
                    inventoryContainer.style.display = 'flex';
                } else {
                    inventoryContainer.style.display = 'none';
                }
            });
            
            document.body.appendChild(toggleButton);
            
            // Add status message element
            const statusMessage = document.createElement('div');
            statusMessage.id = 'inventory-status';
            statusMessage.style.position = 'absolute';
            statusMessage.style.top = '10px';
            statusMessage.style.left = '50%';
            statusMessage.style.transform = 'translateX(-50%)';
            statusMessage.style.padding = '5px 10px';
            statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            statusMessage.style.color = 'white';
            statusMessage.style.borderRadius = '3px';
            statusMessage.style.zIndex = '1002';
            statusMessage.style.display = 'none';
            
            document.body.appendChild(statusMessage);
        }
    }
    
    /**
     * Make a slot droppable for drag and drop functionality
     * @param {HTMLElement} slot - The slot element
     */
    makeSlotDroppable(slot) {
        // Make the slot a drop target
        slot.addEventListener('dragover', (event) => {
            event.preventDefault(); // Allow drop
            slot.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; // Highlight on dragover
        });
        
        slot.addEventListener('dragleave', () => {
            slot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Reset highlight
        });
        
        slot.addEventListener('drop', (event) => {
            event.preventDefault();
            slot.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Reset highlight
            
            // Get source slot index from dragged item
            const sourceSlotIndex = parseInt(event.dataTransfer.getData('slotIndex'));
            const targetSlotIndex = parseInt(slot.dataset.slotIndex);
            
            // Find local player entity
            const localPlayerEntity = this.world.entities.find(entity => 
                entity.active && 
                entity.hasComponent('PlayerComponent') && 
                entity.getComponent('PlayerComponent').isLocalPlayer
            );
            
            if (!localPlayerEntity || !localPlayerEntity.hasComponent('InventoryComponent')) return;
            
            const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
            const playerComponent = localPlayerEntity.getComponent('PlayerComponent');
            
            // Don't do anything if source and target are the same
            if (sourceSlotIndex === targetSlotIndex) return;
            
            // Get items from source and target slots
            const sourceItem = inventoryComponent.slots[sourceSlotIndex];
            const targetItem = inventoryComponent.slots[targetSlotIndex];
            
            // If source slot is empty, do nothing
            if (!sourceItem) return;
            
            // Swap items
            inventoryComponent.slots[targetSlotIndex] = sourceItem;
            inventoryComponent.slots[sourceSlotIndex] = targetItem;
            
            // Update UI
            this.updateInventoryUI(inventoryComponent);
            
            // Notify server about inventory change
            if (this.socket) {
                this.socket.emit('inventory update', {
                    playerId: playerComponent.playerId,
                    action: 'move',
                    sourceSlotIndex: sourceSlotIndex,
                    targetSlotIndex: targetSlotIndex
                });
            }
        });
    }
    
    /**
     * Update the inventory UI based on the inventory component
     * @param {InventoryComponent} inventoryComponent - The inventory component
     */
    updateInventoryUI(inventoryComponent) {
        const slots = document.querySelectorAll('.inventory-slot');
        
        slots.forEach((slot, index) => {
            // Clear slot
            slot.innerHTML = '';
            slot.title = '';
            
            // Get item in this slot
            const item = inventoryComponent.slots[index];
            
            if (item) {
                // Create item display
                const itemDisplay = document.createElement('div');
                itemDisplay.className = 'inventory-item';
                itemDisplay.style.width = '90%';
                itemDisplay.style.height = '90%';
                itemDisplay.style.borderRadius = '3px';
                itemDisplay.style.display = 'flex';
                itemDisplay.style.justifyContent = 'center';
                itemDisplay.style.alignItems = 'center';
                itemDisplay.style.color = 'white';
                itemDisplay.style.fontSize = '8px';
                itemDisplay.style.overflow = 'hidden';
                
                // Check if the item has a custom icon path
                if (item.inventoryIconPath) {
                    // Use the custom icon as background image
                    // Make sure we're using the correct path format
                    let iconPath = item.inventoryIconPath;
                    
                    // Remove any leading slash as it might cause issues
                    if (iconPath.startsWith('/')) {
                        iconPath = iconPath.substring(1);
                    }
                    
                    console.log(`Loading inventory icon from: ${iconPath}`);
                    itemDisplay.style.backgroundImage = `url('${iconPath}')`;
                    itemDisplay.style.backgroundSize = 'contain';
                    itemDisplay.style.backgroundPosition = 'center';
                    itemDisplay.style.backgroundRepeat = 'no-repeat';
                    // Don't show text when using an icon
                    itemDisplay.textContent = '';
                } else {
                    // Fallback to colored box with text
                    itemDisplay.style.backgroundColor = this.getItemColor(item.id);
                    itemDisplay.textContent = item.name.substring(0, 3);
                }
                
                // Add quantity display if item is stackable and quantity > 1
                if (item.quantity && item.quantity > 1) {
                    const quantityDisplay = document.createElement('div');
                    quantityDisplay.className = 'item-quantity';
                    quantityDisplay.style.position = 'absolute';
                    quantityDisplay.style.bottom = '2px';
                    quantityDisplay.style.right = '2px';
                    quantityDisplay.style.fontSize = '8px';
                    quantityDisplay.style.color = 'white';
                    quantityDisplay.style.textShadow = '1px 1px 1px black';
                    quantityDisplay.textContent = item.quantity;
                    itemDisplay.appendChild(quantityDisplay);
                    
                    // Make sure the parent has relative positioning for absolute child
                    itemDisplay.style.position = 'relative';
                }
                
                // Set tooltip
                slot.title = `${item.name}\n${item.description}${item.quantity > 1 ? `\nQuantity: ${item.quantity}` : ''}`;
                
                // Make item draggable
                itemDisplay.draggable = true;
                itemDisplay.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('slotIndex', index.toString());
                    itemDisplay.style.opacity = '0.5';
                });
                
                itemDisplay.addEventListener('dragend', () => {
                    itemDisplay.style.opacity = '1';
                });
                
                slot.appendChild(itemDisplay);
            }
        });
    }
    
    /**
     * Show a status message to the player
     * @param {string} message - The message to show
     * @param {number} duration - How long to show the message in milliseconds
     */
    showStatusMessage(message, duration = 2000) {
        const statusElement = document.getElementById('inventory-status');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.style.display = 'block';
        
        // Clear any existing timeout
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        
        // Hide after duration
        this.statusTimeout = setTimeout(() => {
            statusElement.style.display = 'none';
        }, duration);
    }
    
    /**
     * Get a color for an item based on its ID
     * @param {number} itemId - The item ID
     * @returns {string} The color as a CSS string
     */
    getItemColor(itemId) {
        // Define colors for specific item IDs
        const colors = {
            0: '#aaaaaa', // Default item (gray)
            1: '#3498db'  // Basic item (blue)
        };
        
        // Return specific color if defined, otherwise generate one based on ID
        return colors[itemId] || `hsl(${(itemId * 137) % 360}, 70%, 60%)`;
    }
    
    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        // Ensure player has an inventory component
        if (!entity.hasComponent('InventoryComponent')) {
            // Add inventory component if missing
            entity.addComponent(new InventoryComponent());
            
            // Add default item to inventory
            const inventoryComponent = entity.getComponent('InventoryComponent');
            const playerComponent = entity.getComponent('PlayerComponent');
            
            inventoryComponent.addItem({
                id: 0,
                name: 'Default Item',
                description: 'The default item that every player starts with'
            });
            
            // Update UI if this is the local player
            if (playerComponent.isLocalPlayer) {
                this.updateInventoryUI(inventoryComponent);
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
