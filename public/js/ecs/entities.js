// ECS Entities
// Factories for creating common entity types

import * as THREE from 'three';
import { Entity } from './core.js';
import { 
    TransformComponent, 
    MeshComponent, 
    RotationComponent, 
    NetworkSyncComponent,
    PlayerComponent,
    MovementComponent 
} from './components.js';

/**
 * Create a cube entity with mesh, transform, and rotation components
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created cube entity
 */
export function createCube(world, options = {}) {
    // Default options
    const config = {
        size: 1,
        color: 0x00ff00,
        position: new THREE.Vector3(0, 0, 0),
        rotationSpeed: new THREE.Vector3(0.5, 0.8, 0.3),
        ...options
    };
    
    // Create geometry, material, and mesh
    const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
    const material = new THREE.MeshStandardMaterial({ 
        color: config.color,
        roughness: 0.7,
        metalness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Create entity and add components
    const entity = new Entity();
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position,
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));
    
    // Mesh component
    entity.addComponent(new MeshComponent({
        mesh: mesh
    }));
    
    // Rotation component
    entity.addComponent(new RotationComponent({
        speed: config.rotationSpeed
    }));
    
    // Network sync component
    entity.addComponent(new NetworkSyncComponent({
        syncProperties: ['rotation']
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}

/**
 * Create a directional light entity
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created light entity
 */
export function createLight(world, options = {}) {
    // Default options
    const config = {
        color: 0xffffff,
        intensity: 1,
        position: new THREE.Vector3(5, 5, 5),
        ...options
    };
    
    // Create light
    const light = new THREE.DirectionalLight(config.color, config.intensity);
    
    // Create entity and add components
    const entity = new Entity();
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position
    }));
    
    // Custom light component
    entity.addComponent(new class LightComponent extends Component {
        constructor() {
            super({
                light: light
            });
        }
    });
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}

/**
 * Create a ground plane entity for players to move on
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created ground entity
 */
export function createGround(world, options = {}) {
    // Default options
    const config = {
        width: 20,
        height: 20,
        color: 0x333333,
        position: new THREE.Vector3(0, -0.5, 0),
        ...options
    };
    
    // Create geometry, material, and mesh
    const geometry = new THREE.PlaneGeometry(config.width, config.height);
    const material = new THREE.MeshStandardMaterial({ 
        color: config.color,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Rotate plane to be horizontal
    mesh.rotation.x = -Math.PI / 2;
    
    // Create entity and add components
    const entity = new Entity();
    
    // Transform component
    entity.addComponent(new TransformComponent({
        position: config.position,
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
        scale: new THREE.Vector3(1, 1, 1)
    }));
    
    // Mesh component
    entity.addComponent(new MeshComponent({
        mesh: mesh
    }));
    
    // Add entity to world
    world.addEntity(entity);
    
    return entity;
}

/**
 * Create a player entity with mesh, transform, and movement components
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created player entity
 */
export function createPlayer(world, options = {}) {
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
