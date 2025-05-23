// ECS Inventory Entities
// Factories for creating inventory-related entities

import * as THREE from 'three';
import { Entity } from './core.js';
import { 
    TransformComponent, 
    MeshComponent
} from './components.js';
import {
    ItemComponent,
    InteractableComponent
} from './inventoryComponents.js';
import { getSocket } from '../network.js';

/**
 * Create an item entity that can be picked up
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createItem(world, options = {}) {
    // Default options
    const config = {
        uuid: options.uuid || null, // Unique identifier for world items
        id: options.id || 0,
        name: options.name || 'Default Item',
        description: options.description || 'A basic item',
        position: options.position || new THREE.Vector3(0, 0, 0),
        color: options.color || 0xffaa00,
        size: options.size || 0.3,
        isPickupable: options.isPickupable !== undefined ? options.isPickupable : true,
        ...options
    };
    
    // Create geometry, material, and mesh for the item
    const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
    const material = new THREE.MeshStandardMaterial({ 
        color: config.color,
        roughness: 0.5,
        metalness: 0.5,
        emissive: new THREE.Color(config.color).multiplyScalar(0.2) // Slight glow effect
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add a slight hover animation
    const itemGroup = new THREE.Group();
    itemGroup.add(mesh);
    
    // Create entity and add components
    const entity = new Entity();
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position,
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));
    
    // Mesh component
    const meshComponent = new MeshComponent({
        mesh: itemGroup
    });
    entity.addComponent(meshComponent);

    // Store entity ID in mesh's userData for easy lookup during raycasting
    // The raycaster intersects with 'mesh', so 'mesh' needs the entityId.
    mesh.userData.entityId = entity.id; 
    // itemGroup.userData.entityId = entity.id; // Optionally keep this, but mesh.userData is primary for raycasting

    // Item component
    entity.addComponent(new ItemComponent({
        uuid: config.uuid,
        id: config.id,
        name: config.name,
        description: config.description,
        isPickupable: config.isPickupable
    }));
    
    // Interactable component
    entity.addComponent(new InteractableComponent({
        type: 'item',
        range: 1.5, // Default interaction range
        onInteract: (interactingPlayerEntity, ownEntity) => {
            const itemComp = ownEntity.getComponent('ItemComponent');
            if (!itemComp || !itemComp.uuid) {
                console.error('InteractableComponent: ItemComponent or item UUID missing on interact.', ownEntity.id);
                return;
            }
            const itemUuid = itemComp.uuid;
            console.log(`InteractableComponent: onInteract called for item UUID: ${itemUuid}. Emitting 'inventory update' (pickup) to server.`);
            
            const socketInstance = getSocket(); // Call getSocket() here
            // Ensure socket is available
            if (socketInstance) { // Check socketInstance
                socketInstance.emit('inventory update', { 
                    action: 'pickup', 
                    itemUuid: itemUuid 
                });
            } else {
                console.error('InteractableComponent: Socket instance is not available for emitting pickup request.');
            }
        }
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}

/**
 * Create a default item for a player's inventory (not in the world)
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createDefaultItem(world, options = {}) {
    // Default options for the default item
    const config = {
        id: 0,
        name: 'Default Item',
        description: 'The default item that every player starts with',
        ownerId: options.ownerId || null,
        slotIndex: options.slotIndex || 0,
        ...options
    };
    
    // Create entity without mesh (since it's just in inventory)
    const entity = new Entity();
    
    // Item component
    entity.addComponent(new ItemComponent({
        id: config.id,
        name: config.name,
        description: config.description,
        isPickupable: false, // Cannot be dropped
        ownerId: config.ownerId,
        slotIndex: config.slotIndex
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}

/**
 * Create a basic item that can be picked up
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createBasicItem(world, options = {}) {
    // Default options for basic item
    const config = {
        uuid: options.uuid || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        id: 1,
        name: 'Basic Item',
        description: 'A basic item that can be picked up',
        position: options.position || new THREE.Vector3(0, 0.15, 0), // Slightly above ground
        color: 0x3498db, // Blue color
        ...options
    };
    
    return createItem(world, config);
}
