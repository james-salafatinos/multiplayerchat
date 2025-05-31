// ECS Entities
// Factories for creating common entity types

import * as THREE from 'three';
import { Entity } from '../core/index.js';  
import { 
    TransformComponent, 
    MeshComponent, 
    NetworkSyncComponent,
    PlayerComponent,
    MovementComponent 
} from '../components/index.js';


/**
 * Create a player entity with mesh, transform, and movement components
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created player entity
 */
export function createPlayerEntity(world, options = {}) {
    // Default options
    const config = {
        playerId: null,
        username: 'Player',
        isLocalPlayer: false,
        color: '#3498db',
        position: new THREE.Vector3(0, 0, 0),
        ...options
    };
    
    // Create geometry, material, and mesh for player
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(config.color),
        roughness: 0.7,
        metalness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the mesh so its bottom is at y=0
    mesh.position.y = 0.5;
    
    // Create a group to hold the mesh and any future player elements
    const playerGroup = new THREE.Group();
    playerGroup.add(mesh);
    
    // Create entity and add components
    const entity = new Entity();
    
    // We'll set the entity ID after adding to world when ID is guaranteed to be set
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position,
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));
    
    // Mesh component
    entity.addComponent(new MeshComponent({
        mesh: playerGroup
    }));
    
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
