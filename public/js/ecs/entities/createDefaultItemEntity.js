// ECS Inventory Entities
// Factories for creating inventory-related entities

import * as THREE from 'three';
import { Entity } from '../core/index.js';
import { 
    TransformComponent, 
    MeshComponent
} from '../components/index.js';
import {
    ItemComponent,
    InteractableComponent
} from '../components/index.js';
import { getSocket } from '../../network.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create a loader instance to be reused
const gltfLoader = new GLTFLoader();

/**
 * Create a default item for a player's inventory (not in the world)
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createDefaultItemEntity(world, options = {}) {
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
