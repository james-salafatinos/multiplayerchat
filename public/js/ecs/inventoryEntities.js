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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create a loader instance to be reused
const gltfLoader = new GLTFLoader();

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
        gltfPath: options.gltfPath || null,
        ...options
    };
    
    // Create a group to hold the item mesh
    const itemGroup = new THREE.Group();
    
    // Create entity and add components
    const entity = new Entity();
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position,
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));
    
    // Mesh component (initially empty)
    const meshComponent = new MeshComponent({
        mesh: itemGroup
    });
    entity.addComponent(meshComponent);
    
    // Item component
    entity.addComponent(new ItemComponent({
        uuid: config.uuid,
        id: config.id,
        name: config.name,
        description: config.description,
        isPickupable: config.isPickupable,
        gltfPath: config.gltfPath
    }));
    
    // Try to load GLTF model if path is provided
    if (config.gltfPath) {
        // Make sure we're using the correct path format
        let modelPath = config.gltfPath;
        
        // Remove any leading slash as it might cause issues
        if (modelPath.startsWith('/')) {
            modelPath = modelPath.substring(1);
        }
        
        console.log(`Attempting to load 3D model from: ${modelPath}`);
        gltfLoader.load(
            modelPath,
            (gltf) => {
                // Success callback
                console.log(`Loaded model for item ${config.name} from ${config.gltfPath}`);
                
                // Clear any existing meshes
                while (itemGroup.children.length > 0) {
                    itemGroup.remove(itemGroup.children[0]);
                }
                
                // Add the loaded model to the group
                itemGroup.add(gltf.scene);
                
                // Scale the model to appropriate size
                const box = new THREE.Box3().setFromObject(gltf.scene);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = config.size / maxDim;
                gltf.scene.scale.set(scale, scale, scale);
                
                // Ensure all meshes in the model have the entity ID for raycasting
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.userData.entityId = entity.id;
                    }
                });
            },
            (xhr) => {
                // Progress callback
                console.log(`${(xhr.loaded / xhr.total * 100)}% loaded for ${config.name}`);
            },
            (error) => {
                // Error callback
                console.error(`Error loading model for ${config.name}:`, error);
                
                // Fallback to a simple box if model loading fails
                createFallbackMesh(itemGroup, config, entity.id);
            }
        );
    } else {
        // No GLTF path, use a simple box
        createFallbackMesh(itemGroup, config, entity.id);
    }
    
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
 * Create a fallback mesh for items when GLTF loading fails or is not available
 * @param {THREE.Group} group - The group to add the mesh to
 * @param {Object} config - The item configuration
 * @param {string} entityId - The entity ID to store in userData
 */
function createFallbackMesh(group, config, entityId) {
    // Create geometry, material, and mesh for the item
    const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
    const material = new THREE.MeshStandardMaterial({ 
        color: config.color,
        roughness: 0.5,
        metalness: 0.5,
        emissive: new THREE.Color(config.color).multiplyScalar(0.2) // Slight glow effect
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Store entity ID in mesh's userData for raycasting
    mesh.userData.entityId = entityId;
    
    // Add mesh to group
    group.add(mesh);
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
