// ECS Entities
// Factories for creating common entity types

import * as THREE from 'three';
import { Entity } from '../core/index.js';  
import { 
    TransformComponent, 
} from '../components/index.js';


/**
 * Create a directional light entity
 * @param {World} world - The ECS world to add the entity to
 * @param {Object} options - Optional configuration parameters
 * @returns {Entity} The created light entity
 */
export function createLightEntity(world, options = {}) {
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

   