// public/js/debug.js
// Client-side debug utilities for sending ECS state to the server

import { getSocket } from './network.js';

/**
 * Initialize debug event listeners
 * @param {World} world - The ECS world
 * @param {Map} playerEntities - Map of player entities
 * @param {Map} worldItemEntities - Map of world item entities
 */
export function initDebugModule(world, playerEntities, worldItemEntities) {
    const socket = getSocket();
    
    // Listen for debug data requests from the server
    socket.on('request-debug-entities', () => {
        sendEntitiesDebugData(socket, world);
    });
    
    socket.on('request-debug-players', () => {
        sendPlayersDebugData(socket, playerEntities);
    });
    
    socket.on('request-debug-items', () => {
        sendItemsDebugData(socket, worldItemEntities);
    });
    
    console.log('[Debug] Debug module initialized');
}

/**
 * Send entity data to the server for debugging
 * @param {Socket} socket - Socket.io client instance
 * @param {World} world - The ECS world
 */
function sendEntitiesDebugData(socket, world) {
    // Convert entities to a serializable format
    const entities = world.entities.map(entity => {
        const components = {};
        
        // Convert the components Map to a plain object
        entity.components.forEach((component, componentName) => {
            // Create a serializable version of the component
            // Filter out non-serializable properties like Three.js objects
            components[componentName] = serializeComponent(component);
        });
        
        return {
            id: entity.id,
            active: entity.active,
            components
        };
    });
    
    // Send the data to the server
    socket.emit('debug-entities-data', entities);
}

/**
 * Send player entity data to the server for debugging
 * @param {Socket} socket - Socket.io client instance
 * @param {Map} playerEntities - Map of player entities
 */
function sendPlayersDebugData(socket, playerEntities) {
    const players = [];
    
    playerEntities.forEach((entity, playerId) => {
        // Get relevant components
        const playerComponent = entity.getComponent('PlayerComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        const inventoryComponent = entity.getComponent('InventoryComponent');
        const skillsComponent = entity.getComponent('SkillsComponent');
        
        // Create a serializable player object
        const player = {
            id: playerId,
            entityId: entity.id,
            username: playerComponent ? playerComponent.username : 'Unknown',
            position: transformComponent ? {
                x: transformComponent.position.x,
                y: transformComponent.position.y,
                z: transformComponent.position.z
            } : null,
            rotation: transformComponent ? {
                x: transformComponent.rotation.x,
                y: transformComponent.rotation.y,
                z: transformComponent.rotation.z
            } : null,
            inventory: inventoryComponent ? serializeComponent(inventoryComponent) : {},
            skills: skillsComponent ? serializeComponent(skillsComponent) : {}
        };
        
        players.push(player);
    });
    
    // Send the data to the server
    socket.emit('debug-players-data', players);
}

/**
 * Send world item entity data to the server for debugging
 * @param {Socket} socket - Socket.io client instance
 * @param {Map} worldItemEntities - Map of world item entities
 */
function sendItemsDebugData(socket, worldItemEntities) {
    const items = [];
    
    worldItemEntities.forEach((entity, itemId) => {
        // Get relevant components
        const transformComponent = entity.getComponent('TransformComponent');
        const itemComponent = entity.getComponent('ItemComponent');
        
        // Create a serializable item object
        const item = {
            id: itemId,
            entityId: entity.id,
            type: itemComponent ? itemComponent.type : 'Unknown',
            position: transformComponent ? {
                x: transformComponent.position.x,
                y: transformComponent.position.y,
                z: transformComponent.position.z
            } : null,
            properties: itemComponent ? serializeComponent(itemComponent) : {}
        };
        
        items.push(item);
    });
    
    // Send the data to the server
    socket.emit('debug-items-data', items);
}

/**
 * Serialize a component to a plain object, removing non-serializable properties
 * @param {Object} component - The component to serialize
 * @returns {Object} A serializable version of the component
 */
function serializeComponent(component) {
    if (!component) return {};
    
    // Create a deep copy of the component
    const serialized = {};
    
    // Copy all serializable properties
    for (const [key, value] of Object.entries(component)) {
        // Skip functions and complex objects like Three.js objects
        if (typeof value === 'function') continue;
        if (value && typeof value === 'object' && value.isObject3D) continue;
        if (value && typeof value === 'object' && value.isBufferGeometry) continue;
        if (value && typeof value === 'object' && value.isMaterial) continue;
        
        // Handle nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            serialized[key] = serializeComponent(value);
        } else {
            serialized[key] = value;
        }
    }
    
    return serialized;
}
