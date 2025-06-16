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
        isMoving: false, // Default animation state
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

    // Create entity first so we have an ID to pass to the character controller
    // Add entity to world early so it has an ID
    world.addEntity(entity);
    
    // CharacterControllerComponent handles its own model loading and scene addition
    const characterParams = {
        scene: scene,
        assetPath: './models/character/', // As per your folder structure
        modelFile: 'model.fbx',
        modelScale: config.isLocalPlayer ? 0.01 : 0.01, // Same scale for both local and remote players
        animationFiles: {
            idle: 'idle.fbx',
            walk: 'walk.fbx',
            run: 'run.fbx',
            dance: 'dance.fbx'
        },
        isLocalPlayer: config.isLocalPlayer,
        entityId: entity.id, // Pass entity ID to the character controller
        playerId: config.playerId, // Pass player ID as well for better logging
        initialIsMoving: config.isMoving // Pass initial movement state
    };
    
    console.log(`[NET-ANIM-DBG] Creating CharacterControllerComponent for ${config.isLocalPlayer ? 'LOCAL' : 'REMOTE'} player entity ${entity.id} with playerId ${config.playerId}`);
    entity.addComponent(new CharacterControllerComponent(characterParams));
    
    // Remove entity from world since we'll add it again at the end
    world.removeEntity(entity);
    
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
        isMoving: config.isMoving // Use the isMoving state from server data
    }));
    
    // Network sync component
    entity.addComponent(new NetworkSyncComponent({
        syncProperties: ['position']
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}
