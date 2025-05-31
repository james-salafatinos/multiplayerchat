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
import { createItemEntity } from './createItemEntity.js';
// Create a loader instance to be reused
const gltfLoader = new GLTFLoader();

/**
 * Create a basic item that can be picked up
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createBasicItemEntity(world, options = {}) {
    // Default options for basic item
    const config = {
        uuid: options.uuid || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        id: options.id || 1,
        name: options.name || 'Basic Item',
        description: options.description || 'A basic item that can be picked up',
        position: options.position || new THREE.Vector3(0, 0.15, 0), // Slightly above ground
        color: 0x3498db, // Blue color
        gltfPath: options.gltfPath || null, // Make sure gltfPath is explicitly passed
        ...options
    };
    
    console.log('Creating basic item with config:', config);
    
    return createItemEntity(world, config);
}
