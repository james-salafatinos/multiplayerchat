// ECS Entities
// Factories for creating common entity types

import * as THREE from 'three';
import { Entity } from '../core/index.js';  
import { 
    TransformComponent, 
    // MeshComponent, // Will be handled by CharacterControllerComponent
    NetworkSyncComponent,
    PlayerComponent,
    MovementComponent,
    CharacterControllerComponent // Added
} from '../components/index.js';


/**
 * Create a player entity with mesh, transform, and movement components
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created player entity
 */
export function createPlayerEntity(world, scene, options = {}) { // Added 'scene' parameter
    // Default options
    const config = {
        playerId: null,
        username: 'Player',
        isLocalPlayer: false,
        color: '#3498db',
        position: new THREE.Vector3(0, 0, 0),
        ...options
    };
    
    // Entity creation
    const entity = new Entity();

    // Transform component - CharacterController will manage its own model's position relative to this
    entity.addComponent(new TransformComponent({
        position: config.position, // Initial position for the entity
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));

    // CharacterControllerComponent handles its own model loading and scene addition
    const characterParams = {
        scene: scene,
        assetPath: './models/character/', // As per your folder structure
        modelFile: 'model.fbx',
        modelScale: config.isLocalPlayer ? 0.01 : 0.01, // Increased scale for debugging // Example: can vary scale, or keep consistent. Adjust as needed.
        animationFiles: {
            idle: 'idle.fbx',
            walk: 'walk.fbx', // Assuming walk.fbx based on typical states
            run: 'run.fbx',
            dance: 'dance.fbx' // Assuming dance.fbx based on typical states
        },
        isLocalPlayer: config.isLocalPlayer // Pass this to the controller if it needs to behave differently
    };
    entity.addComponent(new CharacterControllerComponent(characterParams));
    
    // Player component
    entity.addComponent(new PlayerComponent({
        playerId: config.playerId,
        username: config.username,
        isLocalPlayer: config.isLocalPlayer,
        color: config.color
    }));
    
    // Movement component
    entity.addComponent(new MovementComponent({
        targetPosition: new THREE.Vector3().copy(config.position),
        speed: 5,
        isMoving: false
    }));
    
    // Network sync component
    entity.addComponent(new NetworkSyncComponent({
        syncProperties: ['position']
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}
