// createResourceEntity.js
// Factory function for creating resource entities (rocks, trees)

import { 
    TransformComponent, 
    MeshComponent, 
    ResourceComponent, 
    InteractableComponent 
} from '../components/index.js';


/**
 * Create a resource entity (rock or tree)
 * @param {World} world - The ECS world
 * @param {Object} config - Configuration for the resource
 * @param {string} config.type - Type of resource ('rock' or 'tree')
 * @param {Object} config.position - Position {x, y, z}
 * @param {number} config.scale - Scale factor (default: 1)
 * @param {string} config.modelPath - Path to the 3D model
 * @param {number} config.entityId - Optional entity ID (for network sync)
 * @returns {number} Entity ID
 */
export function createResourceEntity(world, config) {
    const { 
        type = 'rock', 
        position, 
        scale = 1, 
        modelPath, 
        entityId = null,
        yieldItemId,
        yieldAmount = 1,
        harvestTime
    } = config;
    
    // Default values based on resource type
    const defaults = {
        rock: {
            modelPath: '/models/resources/rock.glb',
            yieldItemId: 'ore',
            harvestTime: 3000
        },
        tree: {
            modelPath: '/models/resources/tree.glb',
            yieldItemId: 'logs',
            harvestTime: 4000
        }
    };
    
    // Create entity with provided ID or generate new one
    const entity = entityId !== null ? world.createEntityWithId(entityId) : world.createEntity();
    
    // Add transform component
    world.addComponent(entity, new TransformComponent({
        position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: scale, y: scale, z: scale }
    }));
    
    // Add mesh component with model
    world.addComponent(entity, new MeshComponent({
        modelPath: modelPath || defaults[type].modelPath,
        isInteractable: true
    }));
    
    // Add resource component
    world.addComponent(entity, new ResourceComponent({
        type,
        state: 'available',
        yieldItemId: yieldItemId || defaults[type].yieldItemId,
        yieldAmount,
        harvestTime: harvestTime || defaults[type].harvestTime
    }));
    
    // Add interactable component
    world.addComponent(entity, new InteractableComponent({
        type: 'resource',
        interactionType: type === 'rock' ? 'mine' : 'chop',
        interactionDistance: 3 // Units
    }));
    
    return entity;
}
