// server/socket/resources.js
// Resource gathering functionality for socket.io (mining, chopping)

import { statements } from '../db/index.js';
import { getItemById } from '../utils/itemManager.js';

// Import the resource manager (convert to ES import)
const resourceManager = await import('../game/resourceManager.js').then(module => module.default);

/**
 * Initialize the resource management system
 */
export function initResources() {
    console.log('Initializing resource system...');
    resourceManager.init();
    console.log(`Resource system initialized with ${resourceManager.resources.size} resources`);
}

/**
 * Initialize resource handlers for socket connections
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 */
export function initResourceHandlers(io, players) {
    console.log('Initializing resource handlers...');
    
    io.on('connection', (socket) => {
        // Send initial resource state to the client
        const resources = resourceManager.getAllSerializableResources();
        socket.emit('resources-state', resources);
    
    // Handle resource interaction (mine/chop)
    socket.on('resource interaction', async (data) => {
        console.log(`Resource interaction from ${socket.id}:`, data);
        
        const { resourceId, action } = data;
        const player = players.get(socket.id);
        
        if (!player) {
            console.error(`Player ${socket.id} not found`);
            socket.emit('harvest error', { 
                resourceId,
                error: 'Player not found' 
            });
            return;
        }
        
        // Check if this is a temporary resource ID (format: resource_entityId)
        let resource;
        if (resourceId.startsWith('resource_')) {
            // This is a temporary resource ID - create a temporary resource for testing
            const entityId = resourceId.split('_')[1];
            console.log(`Creating temporary resource for entity ID ${entityId}`);
            
            // Determine resource type based on action
            const resourceType = action === 'chop' ? 'normal_tree' : 'stone_rock';
            
            // Create a temporary resource
            resource = {
                uuid: resourceId,
                resourceTypeId: resourceType,
                position: { x: 0, y: 0, z: 0 }, // We don't need position for testing
                state: 'available'
            };
            console.log('Created temporary resource:', resource);
        } else {
            // Try to get an actual resource from the resource manager
            resource = resourceManager.getResource(resourceId);
        }
        
        if (!resource) {
            console.error(`Resource ${resourceId} not found`);
            socket.emit('harvest error', { 
                resourceId,
                error: 'Resource not found' 
            });
            return;
        }
        
        // Check if action matches resource type
        const isTempResource = resourceId.startsWith('resource_');
        let resourceConfig;
        
        try {
            resourceConfig = await import('../config/resources.js')
                .then(module => module.default[resource.resourceTypeId]);
                
            // For temporary resources, we'll be more lenient with action matching
            if (!isTempResource && 
                ((resourceConfig.type === 'rock' && action !== 'mine') || 
                (resourceConfig.type === 'tree' && action !== 'chop'))) {
                socket.emit('harvest error', { 
                    resourceId,
                    error: `Cannot ${action} this resource` 
                });
                return;
            }
        } catch (error) {
            console.error(`Error loading resource config for ${resource.resourceTypeId}:`, error);
            
            // For temporary resources, create a basic config
            if (isTempResource) {
                const resourceType = action === 'chop' ? 'tree' : 'rock';
                resourceConfig = {
                    type: resourceType,
                    harvestTime: 3000, // 3 seconds
                    respawnTime: 10000, // 10 seconds
                    requiredSkill: null
                };
                console.log('Created temporary resource config:', resourceConfig);
            } else {
                socket.emit('harvest error', { 
                    resourceId,
                    error: `Invalid resource type` 
                });
                return;
            }
        }
        
        // Check if resource is available
        if (resource.state !== 'available') {
            socket.emit('harvest error', { 
                resourceId,
                error: 'This resource is not available for harvesting' 
            });
            return;
        }
        
        // Determine mining time
        const harvestTime = resourceConfig.harvestTime;
        
        // Inform client that harvest has started with duration
        socket.emit('harvest started', {
            resourceId,
            duration: harvestTime
        });
        
        // Mark resource as being harvested
        resource.state = 'harvesting';
        
        // Simulate the harvest process with a timeout
        setTimeout(async () => {
            // Player might have disconnected during harvest
            if (!players.has(socket.id)) return;
            
            try {
                // For temporary resources, handle harvest completion directly
                if (isTempResource) {
                    console.log(`Completing harvest for temporary resource ${resourceId}`);
                    
                    // Generate some basic rewards based on action type
                    const items = [];
                    if (action === 'chop') {
                        items.push({
                            itemId: 'logs',
                            quantity: Math.floor(Math.random() * 3) + 1
                        });
                    } else if (action === 'mine') {
                        items.push({
                            itemId: 'stone',
                            quantity: Math.floor(Math.random() * 2) + 1
                        });
                        
                        // Small chance for ore
                        if (Math.random() < 0.2) {
                            items.push({
                                itemId: 'ore',
                                quantity: 1
                            });
                        }
                    }
                    
                    // Notify client that harvest is complete
                    socket.emit('harvest complete', {
                        resourceId,
                        items: items,
                        experience: 10 // Basic XP reward
                    });
                    
                    // Broadcast resource state update to all clients
                    io.emit('resource state', {
                        resourceId,
                        state: 'depleted',
                        respawnTime: 10000 // 10 seconds for testing
                    });
                    
                    console.log(`Player ${socket.id} harvested temporary resource ${resourceId}`);
                    
                    // Set a timer to respawn the resource
                    setTimeout(() => {
                        // Broadcast resource state update to all clients
                        io.emit('resource state', {
                            resourceId,
                            state: 'available'
                        });
                    }, 10000); // 10 seconds for testing
                } else {
                    // For real resources, use the resource manager
                    const harvestResult = resourceManager.harvestResource(resourceId, player.userId);
                    
                    if (!harvestResult || !harvestResult.success) {
                        socket.emit('harvest error', { 
                            resourceId,
                            error: harvestResult?.message || 'Resource could not be harvested' 
                        });
                        return;
                    }
                    
                    // Add items to player's inventory
                    await addItemToInventory(player, harvestResult.yield.itemId, harvestResult.yield.amount);
                    
                    // Send success response to client
                    socket.emit('harvest complete', {
                        resourceId,
                        items: [{
                            itemId: harvestResult.yield.itemId,
                            quantity: harvestResult.yield.amount
                        }],
                        experience: 10
                    });
                    
                    // Broadcast the resource state change to all clients
                    io.emit('resource state', {
                        resourceId,
                        state: 'depleted',
                        respawnTime: resourceConfig.respawnTime
                    });
                    
                    console.log(`Player ${socket.id} harvested resource ${resourceId} and got ${harvestResult.yield.amount} ${harvestResult.yield.itemId}`);
                    
                    // Set a timer to respawn the resource
                    setTimeout(() => {
                        // Respawn the resource
                        resourceManager.respawnResource(resourceId);
                        
                        // Broadcast resource state update to all clients
                        io.emit('resource state', {
                            resourceId,
                            state: 'available'
                        });
                    }, resourceConfig.respawnTime);
                }
            } catch (error) {
                console.error('Error processing harvest:', error);
                socket.emit('harvest error', {
                    resourceId,
                    error: 'Failed to process harvest'
                });
                
                // If there was an error, we need to restore the resource
                if (!isTempResource) {
                    resourceManager.respawnResource(resourceId);
                }
                
                io.emit('resource state', {
                    resourceId,
                    state: 'available'
                });
            }
        }, harvestTime);
    });
    
    // For admin commands to spawn resources
    socket.on('admin spawn resource', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.isAdmin) {
            socket.emit('admin spawn result', { success: false, message: 'Permission denied' });
            return;
        }
        
        const { resourceTypeId, position } = data;
        const resource = resourceManager.spawnResource(resourceTypeId, position);
        
        if (!resource) {
            socket.emit('admin spawn result', { success: false, message: 'Invalid resource type' });
            return;
        }
        
        // Broadcast the new resource to all clients
        io.emit('resource added', resourceManager.getSerializableResource(resource));
        socket.emit('admin spawn result', { success: true, resource: resourceManager.getSerializableResource(resource) });
    });
    
    // For chunk-based resource loading
    socket.on('request chunk resources', (data) => {
        const { chunkKey } = data;
        const resources = resourceManager.getResourcesInChunk(chunkKey);
        const serializableResources = resources.map(resource => 
            resourceManager.getSerializableResource(resource)
        );
        
        socket.emit('chunk resources', {
            chunkKey,
            resources: serializableResources
        });
    });
    });
    
    console.log('Resource handlers initialized');
}

/**
 * Add an item to a player's inventory
 * @param {Object} player - The player object
 * @param {string} itemId - The ID of the item to add
 * @param {number} quantity - The quantity of the item to add
 */
async function addItemToInventory(player, itemId, quantity) {
    // Get item details
    const itemDetails = getItemById(itemId);
    
    if (!itemDetails) {
        throw new Error(`Item ${itemId} not found in item database`);
    }
    
    // Use database to add item to player's inventory
    await statements.addItemToInventory(player.userId, itemId, quantity);
    
    // Get updated inventory and update player object
    player.inventory = await statements.getInventory(player.userId);
}

export { resourceManager };
