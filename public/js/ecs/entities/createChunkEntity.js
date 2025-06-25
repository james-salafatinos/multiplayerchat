/**
 * Create a chunk entity with ground tiles and objects
 */

import * as THREE from 'three';
import { Entity } from '../core/index.js';
import { 
    ChunkComponent, 
    TransformComponent, 
    MeshComponent,
    InteractableComponent,
    ResourceComponent
} from '../components/index.js';
import { assetLoader } from '../../utils/assetLoader.js';
;

// Asset paths
const GROUND_MODEL = '/models/ground/ground.glb';
const ROCK_MODEL = '/models/rocks/rocks_large.glb';
const TREE_MODEL = '/models/trees/tree-small.glb';

// // Noise function for natural object placement
// function noise(x, y) {
//     return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
// }

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
        console.log( 'GroundTile', 'Error creating ground tile', error);
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
        
        // Add resource component
        entity.addComponent(new ResourceComponent({
            type: 'tree',
            state: 'available',
            harvestTime: 3000, // 3 seconds to chop
            visualState: 'normal',
            lootTable: [
                { itemId: 'logs', chance: 1.0, quantity: { min: 1, max: 3 } }
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
        console.log( 'TreeEntity', 'Error creating tree', error);
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
        
        // Add resource component
        entity.addComponent(new ResourceComponent({
            type: 'rock',
            state: 'available',
            harvestTime: 4000, // 4 seconds to mine
            visualState: 'normal',
            lootTable: [
                { itemId: 'stone', chance: 0.8, quantity: { min: 1, max: 2 } },
                { itemId: 'ore', chance: 0.2, quantity: { min: 1, max: 1 } }
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
        console.log( 'RockEntity', 'Error creating rock', error);
        return null;
    }
}

/**
 * Create a chunk entity with ground tiles and objects
 * @param {World} world - The ECS world
 * @param {Object} options - Configuration options
 * @param {Number} options.chunkX - X coordinate of the chunk
 * @param {Number} options.chunkY - Y coordinate of the chunk
 * @param {Number} options.size - Size of the chunk (typically 32)
 * @param {Object} options.serverData - Server-provided chunk data
 * @returns {Entity} - The created chunk entity
 */
export function createChunk(world, options = {}) {
    const chunkX = options.chunkX || 0;
    const chunkY = options.chunkY || 0;
    const size = options.size || 32;
    const serverData = options.serverData;
    
    if (!serverData) {
        console.log( 'createChunk', `Cannot create chunk at ${chunkX}, ${chunkY} - no server data provided`);
        return null;
    }
    
    // console.log( 'createChunk', `Creating chunk at ${chunkX}, ${chunkY} from server data`);
    
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
        // Use server data to populate the chunk
        populateChunkFromServerData(world, chunkEntity, { 
            chunkX, 
            chunkY, 
            size, 
            serverData 
        });
    }, 0);
    
    return chunkEntity;
}

/**
 * Asynchronously populate a chunk with ground tiles and objects
 * This is the legacy method that uses client-side generation
 */
// async function populateChunk(world, chunkEntity, options) {
//     const { chunkX, chunkY, size } = options;
    
//     // Generate ground tiles for the entire chunk
//     const tilePromises = [];
//     for (let x = 0; x < size; x++) {
//         for (let y = 0; y < size; y++) {
//             tilePromises.push(createGroundTile(world, {
//                 x,
//                 y,
//                 chunkX,
//                 chunkY,
//                 chunkSize: size,
//                 parent: chunkEntity
//             }));
//         }
//     }
    
//     // Wait for all ground tiles to be created
//     await Promise.all(tilePromises);
    
//     // Generate objects (trees, rocks) based on noise
//     const objectPromises = [];
    
//     // Use noise function to determine object placement
//     for (let x = 0; x < size; x += 2) { // Space objects out
//         for (let y = 0; y < size; y += 2) {
//             const noiseVal = noise(chunkX * size + x, chunkY * size + y);
            
//             // Skip edges to prevent objects being cut off at chunk boundaries
//             if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) continue;
            
//             // 5% chance for a rock
//             if (noiseVal > 0.95) {
//                 objectPromises.push(createRockEntity(world, {
//                     x,
//                     y, 
//                     chunkX,
//                     chunkY,
//                     chunkSize: size,
//                     parent: chunkEntity
//                 }));
//             } 
//             // 10% chance for a tree (if not a rock)
//             else if (noiseVal > 0.85) {
//                 objectPromises.push(createTreeEntity(world, {
//                     x,
//                     y,
//                     chunkX,
//                     chunkY,
//                     chunkSize: size,
//                     parent: chunkEntity
//                 }));
//             }
//         }
//     }
    
//     // Wait for all objects to be created
//     await Promise.all(objectPromises);
    
//     console.log(`Chunk ${chunkX}, ${chunkY} fully populated using client-side generation`);
// }

/**
 * Create instanced ground tiles for an entire chunk
 * @param {World} world - The ECS world
 * @param {Entity} chunkEntity - The chunk entity to populate
 * @param {Object} options - Configuration options
 * @returns {Entity} - The created instanced ground tiles entity
 */
async function createInstancedGroundTiles(world, chunkEntity, options) {
    const { chunkX, chunkY, size, terrain = 'grass' } = options;
    
    // Create entity for the instanced ground tiles
    const entity = new Entity();
    
    try {
        // Load the ground model
        const groundModel = await assetLoader.loadModel(GROUND_MODEL);
        
        // Extract the mesh from the model
        let groundMesh;
        groundModel.traverse(child => {
            if (child.isMesh) {
                groundMesh = child;
            }
        });
        
        if (!groundMesh) {
            console.log( 'createInstancedGroundTiles', 'Could not find mesh in ground model');
            return null;
        }
        
        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(
            groundMesh.geometry,
            groundMesh.material,
            size * size // Total number of tiles in the chunk
        );
        
        // Set entity ID in userData for raycasting
        instancedMesh.userData.entityId = entity.id;
        instancedMesh.userData.isInstanced = true;
        
        // Create matrix for each instance
        const matrix = new THREE.Matrix4();
        let instanceIndex = 0;
        
        // Calculate world position offset for the chunk
        const chunkOffsetX = chunkX * size;
        const chunkOffsetZ = chunkY * size;
        
        // Position each ground tile instance
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const worldX = chunkOffsetX + x;
                const worldZ = chunkOffsetZ + y;
                
                matrix.setPosition(worldX, -0.5, worldZ);
                instancedMesh.setMatrixAt(instanceIndex, matrix);
                
                // Store tile coordinates for raycasting
                instancedMesh.userData[`tile_${instanceIndex}`] = { x, y };
                
                instanceIndex++;
            }
        }
        
        // Update the instance matrix buffer
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Add transform component for the entire chunk of ground tiles
        entity.addComponent(new TransformComponent({
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1)
        }));
        
        // Add mesh component
        entity.addComponent(new MeshComponent({
            mesh: instancedMesh
        }));
        
        // Add interactable component for "walk here" functionality
        entity.addComponent(new InteractableComponent({
            type: 'ground',
            actions: [{
                name: 'Walk here',
                handler: 'walkTo'
            }]
        }));
        
        // Add to world
        world.addEntity(entity);
        
        // Add to parent chunk's entity list
        if (chunkEntity) {
            const chunkComponent = chunkEntity.getComponent(ChunkComponent);
            if (chunkComponent) {
                chunkComponent.addEntity(entity.id);
            }
        }
        
        // console.log( 'createInstancedGroundTiles', `Created instanced ground tiles for chunk ${chunkX}, ${chunkY} with ${size * size} tiles`);
        return entity;
    } catch (error) {
        console.log( 'createInstancedGroundTiles', 'Error creating instanced ground tiles', error);
        return null;
    }
}

/**
 * Asynchronously populate a chunk using server-provided data
 * @param {World} world - The ECS world
 * @param {Entity} chunkEntity - The chunk entity to populate
 * @param {Object} options - Configuration options
 * @param {Object} options.serverData - Server-provided chunk data
 */
async function populateChunkFromServerData(world, chunkEntity, options) {
    const { chunkX, chunkY, size, serverData } = options;
    
    if (!serverData) {
        console.log( 'populateChunkFromServerData', 'No server data provided for chunk');
        return;
    }
    
    // Create instanced ground tiles for the entire chunk (much faster than individual tiles)
    await createInstancedGroundTiles(world, chunkEntity, {
        chunkX,
        chunkY,
        size,
        terrain: serverData.terrain || 'grass'
    });
    
    // Create objects from server data
    const objectPromises = [];
    
    if (serverData.objects && Array.isArray(serverData.objects)) {
        for (const obj of serverData.objects) {
            if (obj.type === 'tree') {
                objectPromises.push(createTreeEntity(world, {
                    x: obj.x,
                    y: obj.y,
                    chunkX,
                    chunkY,
                    chunkSize: size,
                    parent: chunkEntity,
                    scale: obj.scale,
                    rotation: obj.rotation
                }));
            } else if (obj.type === 'rock') {
                objectPromises.push(createRockEntity(world, {
                    x: obj.x,
                    y: obj.y,
                    chunkX,
                    chunkY,
                    chunkSize: size,
                    parent: chunkEntity,
                    scale: obj.scale,
                    rotation: obj.rotation
                }));
            }
        }
    }
    
    // Wait for all objects to be created
    await Promise.all(objectPromises);
    
    // console.log( 'populateChunkFromServerData', `Chunk ${chunkX}, ${chunkY} fully populated from server data`);
}
