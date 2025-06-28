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
import { loadModel, clone, makeFallback } from '../../utils/assetLoader.js';
;



/**
 * Create an item entity that can be picked up
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created item entity
 */
export function createItemEntity(world, options = {}) {
    // Default options
    const config = {
        uuid: options.uuid || null, // Unique identifier for world items
        id: options.id || 0,
        name: options.name || 'Cake',
        description: options.description || 'A delicious cake',
        position: options.position || new THREE.Vector3(0, 0, 0),
        color: options.color || 0xffaa00,
        size: options.size || 0.3,
        isPickupable: options.isPickupable !== undefined ? options.isPickupable : true,
        gltfPath: options.gltfPath || null,
        useType: options.useType || 'Use', // Default to 'Use' if not specified
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
    
    // Try to load model via centralised loader if path is provided
    if (config.gltfPath) {
        // Normalise relative path
        let modelPath = config.gltfPath;
        if (modelPath.startsWith('/')) modelPath = modelPath.slice(1);
        if (!modelPath.startsWith('models/')) {
            modelPath = `models/${modelPath}`;
        }

        loadModel(modelPath, { scale: 1 })
          .then((base) => {
            // Remove existing children
            itemGroup.clear();
            itemGroup.add(clone(base));
            // Fit model inside bounding box based on config.size
            const box = new THREE.Box3().setFromObject(itemGroup);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = config.size / maxDim;
            itemGroup.scale.setScalar(scaleFactor);
            // Propagate entityId for raycasting
            itemGroup.traverse((c) => {
              if (c.isMesh) c.userData.entityId = entity.id;
            });
          })
          .catch((err) => {
            console.error('Model load failed, using fallback', err);
            itemGroup.add(makeFallback({ color: config.color, size: config.size }));
          });
    } else {
        // No model path specified – use fallback cube
        itemGroup.add(makeFallback({ color: config.color, size: config.size }));
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
            // console.log(`InteractableComponent: onInteract called for item UUID: ${itemUuid}. Emitting 'inventory update' (pickup) to server.`);
            
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
 * (legacy) createFallbackMesh kept for backward compatibility but now delegates to makeFallback
 * @param {THREE.Group} group - The group to add the mesh to
 * @param {Object} config - The item configuration
 * @param {string} entityId - The entity ID to store in userData
 */
function createFallbackMesh(group, config, entityId) {
    const mesh = makeFallback({ color: config.color, size: config.size });
    mesh.userData.entityId = entityId;
    group.add(mesh);
}


