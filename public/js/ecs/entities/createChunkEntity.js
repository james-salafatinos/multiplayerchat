/**
 * Create a chunk entity with ground tiles and objects
 */

import * as THREE from 'three';
import { Entity } from '../core/index.js';
import { 
    ChunkComponent, 
    TransformComponent, 
    MeshComponent,
    InteractableComponent
} from '../components/index.js';
import { assetLoader } from '../../utils/assetLoader.js';

// Asset paths
const GROUND_MODEL = '/models/ground/ground.glb';
const ROCK_MODEL = '/models/rocks/rocks_large.glb';
const TREE_MODEL = '/models/trees/tree-small.glb';

// Noise function for natural object placement
function noise(x, y) {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
}

/**
 * Create a ground tile entity
 * @param {World} world - The ECS world
 * @param {Object} options - Configuration options
 * @returns {Entity} - The created ground tile entity
 */
async function createGroundTile(world, options) {
    const { x, y, chunkX, chunkY, parent } = options;
    
    // Create entity
    const entity = new Entity();
    
    // Calculate world position
    const worldX = chunkX * options.chunkSize + x;
    const worldZ = chunkY * options.chunkSize + y;
    
    try {
        // Load the ground model
        const groundMesh = await assetLoader.loadModel(GROUND_MODEL);
        
        // Position the ground tile
        groundMesh.position.set(0, 0, 0);
        
        // Add transform component
        entity.addComponent(new TransformComponent({
            position: new THREE.Vector3(worldX, -0.5, worldZ),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1)
        }));
        
        // Set entity ID in userData for raycasting
        groundMesh.traverse(object => {
            object.userData.entityId = entity.id;
        });
        
        // Add mesh component
        entity.addComponent(new MeshComponent({
            mesh: groundMesh
        }));
        
        // Add interactable component for "walk here" functionality
        entity.addComponent(new InteractableComponent({
            type: 'ground',
            actions: [{
                name: 'Walk here',
                handler: 'walkTo'
            }]
        }));
        
        // Add to world and return
        world.addEntity(entity);
        
        // Add to parent chunk's entity list
        if (parent) {
            const chunkComponent = parent.getComponent(ChunkComponent);
            if (chunkComponent) {
                chunkComponent.addEntity(entity.id);
            }
        }
        
        return entity;
    } catch (error) {
        console.error('Error creating ground tile:', error);
        return null;
    }
}

/**
 * Create a tree entity
 * @param {World} world - The ECS world
 * @param {Object} options - Configuration options
 * @returns {Entity} - The created tree entity
 */
async function createTreeEntity(world, options) {
    const { x, y, chunkX, chunkY, parent } = options;
    
    // Create entity
    const entity = new Entity();
    
    // Calculate world position with small random offset for natural look
    const offsetX = (Math.random() - 0.5) * 0.6;
    const offsetZ = (Math.random() - 0.5) * 0.6;
    const worldX = chunkX * options.chunkSize + x + offsetX;
    const worldZ = chunkY * options.chunkSize + y + offsetZ;
    
    try {
        // Load the tree model
        const treeMesh = await assetLoader.loadModel(TREE_MODEL);
        
        // Scale the tree as needed
        const scale = 1 + Math.random() * 0.3; // Random size variation
        treeMesh.scale.set(scale, scale, scale);
        
        // Add transform component
        entity.addComponent(new TransformComponent({
            position: new THREE.Vector3(worldX, -0.5, worldZ),
            rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0), // Random rotation
            scale: new THREE.Vector3(scale, scale, scale)
        }));
        
        // Set entity ID in userData for raycasting
        treeMesh.traverse(object => {
            object.userData.entityId = entity.id;
        });
        
        // Add mesh component
        entity.addComponent(new MeshComponent({
            mesh: treeMesh
        }));
        
        // Add interactable component
        entity.addComponent(new InteractableComponent({
            type: 'tree',
            actions: [
                {
                    name: 'Examine',
                    handler: 'examineObject'
                },
                {
                    name: 'Chop down',
                    handler: 'chopTree',
                    requiredSkill: 'woodcutting',
                    requiredLevel: 1
                }
            ]
        }));
        
        // Add to world and return
        world.addEntity(entity);
        
        // Add to parent chunk's entity list
        if (parent) {
            const chunkComponent = parent.getComponent(ChunkComponent);
            if (chunkComponent) {
                chunkComponent.addEntity(entity.id);
            }
        }
        
        return entity;
    } catch (error) {
        console.error('Error creating tree:', error);
        return null;
    }
}

/**
 * Create a rock entity
 * @param {World} world - The ECS world
 * @param {Object} options - Configuration options
 * @returns {Entity} - The created rock entity
 */
async function createRockEntity(world, options) {
    const { x, y, chunkX, chunkY, parent } = options;
    
    // Create entity
    const entity = new Entity();
    
    // Calculate world position with small random offset for natural look
    const offsetX = (Math.random() - 0.5) * 0.6;
    const offsetZ = (Math.random() - 0.5) * 0.6;
    const worldX = chunkX * options.chunkSize + x + offsetX;
    const worldZ = chunkY * options.chunkSize + y + offsetZ;
    
    try {
        // Load the rock model
        const rockMesh = await assetLoader.loadModel(ROCK_MODEL);
        
        // Scale the rock as needed
        const scale = 0.7 + Math.random() * 0.4; // Random size variation
        rockMesh.scale.set(scale, scale, scale);
        
        // Add transform component
        entity.addComponent(new TransformComponent({
            position: new THREE.Vector3(worldX, -0.5, worldZ),
            rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0), // Random rotation
            scale: new THREE.Vector3(scale, scale, scale)
        }));
        
        // Set entity ID in userData for raycasting
        rockMesh.traverse(object => {
            object.userData.entityId = entity.id;
        });
        
        // Add mesh component
        entity.addComponent(new MeshComponent({
            mesh: rockMesh
        }));
        
        // Add interactable component
        entity.addComponent(new InteractableComponent({
            type: 'rock',
            actions: [
                {
                    name: 'Examine',
                    handler: 'examineObject'
                },
                {
                    name: 'Mine',
                    handler: 'mineRock',
                    requiredSkill: 'mining',
                    requiredLevel: 1
                }
            ]
        }));
        
        // Add to world and return
        world.addEntity(entity);
        
        // Add to parent chunk's entity list
        if (parent) {
            const chunkComponent = parent.getComponent(ChunkComponent);
            if (chunkComponent) {
                chunkComponent.addEntity(entity.id);
            }
        }
        
        return entity;
    } catch (error) {
        console.error('Error creating rock:', error);
        return null;
    }
}

/**
 * Create a chunk entity with ground tiles and objects
 * @param {World} world - The ECS world
 * @param {Object} options - Configuration options
 * @returns {Entity} - The created chunk entity
 */
export function createChunk(world, options = {}) {
    const chunkX = options.chunkX || 0;
    const chunkY = options.chunkY || 0;
    const size = options.size || 32;
    
    console.log(`Creating chunk at ${chunkX}, ${chunkY}`);
    
    // Create the chunk entity
    const chunkEntity = new Entity();
    
    // Add chunk component
    chunkEntity.addComponent(new ChunkComponent({
        chunkX,
        chunkY,
        size,
        loaded: true,
        entities: []
    }));
    
    // Add to world
    world.addEntity(chunkEntity);
    
    // Schedule async loading of contents
    setTimeout(() => {
        populateChunk(world, chunkEntity, { chunkX, chunkY, size });
    }, 0);
    
    return chunkEntity;
}

/**
 * Asynchronously populate a chunk with ground tiles and objects
 */
async function populateChunk(world, chunkEntity, options) {
    const { chunkX, chunkY, size } = options;
    
    // Generate ground tiles for the entire chunk
    const tilePromises = [];
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            tilePromises.push(createGroundTile(world, {
                x,
                y,
                chunkX,
                chunkY,
                chunkSize: size,
                parent: chunkEntity
            }));
        }
    }
    
    // Wait for all ground tiles to be created
    await Promise.all(tilePromises);
    
    // Generate objects (trees, rocks) based on noise
    const objectPromises = [];
    
    // Use noise function to determine object placement
    for (let x = 0; x < size; x += 2) { // Space objects out
        for (let y = 0; y < size; y += 2) {
            const noiseVal = noise(chunkX * size + x, chunkY * size + y);
            
            // Skip edges to prevent objects being cut off at chunk boundaries
            if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) continue;
            
            // 5% chance for a rock
            if (noiseVal > 0.95) {
                objectPromises.push(createRockEntity(world, {
                    x,
                    y, 
                    chunkX,
                    chunkY,
                    chunkSize: size,
                    parent: chunkEntity
                }));
            } 
            // 10% chance for a tree (if not a rock)
            else if (noiseVal > 0.85) {
                objectPromises.push(createTreeEntity(world, {
                    x,
                    y,
                    chunkX,
                    chunkY,
                    chunkSize: size,
                    parent: chunkEntity
                }));
            }
        }
    }
    
    // Wait for all objects to be created
    await Promise.all(objectPromises);
    
    console.log(`Chunk ${chunkX}, ${chunkY} fully populated`);
}
