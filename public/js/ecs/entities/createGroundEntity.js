// ECS Entities
// Factories for creating common entity types

import * as THREE from 'three';
import { Entity } from '../core/index.js';  
import { 
    TransformComponent, 
    MeshComponent, 
} from '../components/index.js';


/**
 * Create a ground plane entity for players to move on
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created ground entity
 */
export function createGroundEntity(world, options = {}) {
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
