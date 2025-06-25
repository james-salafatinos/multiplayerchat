// Resource Manager for the server
// Handles spawning, tracking, and managing all resource entities in the game

import { v4 as uuidv4 } from 'uuid';
import resourceTypes from '../config/resources.js';

class ResourceManager {
    constructor() {
        this.resources = new Map(); // uuid -> resource object
        this.resourcesByChunk = new Map(); // chunkKey -> [resource uuids]
        
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('[ResourceManager] Initializing resource manager...');
        
        // In a real game, this would load from a database or world file
        // For now, we'll place some sample resources in the world
        this.spawnInitialResources();
        
        this.initialized = true;
        console.log(`[ResourceManager] Resource manager initialized with ${this.resources.size} resources`);
    }
    
    spawnInitialResources() {
        // Spawn some stone rocks
        this.spawnResourceCluster('stone_rock', { x: 25, y: 0, z: 25 }, 3, 5);
        this.spawnResourceCluster('copper_rock', { x: -25, y: 0, z: 25 }, 2, 4);
        this.spawnResourceCluster('iron_rock', { x: 0, y: 0, z: 40 }, 1, 3);
        
        // Spawn some trees
        this.spawnResourceCluster('normal_tree', { x: -30, y: 0, z: -20 }, 3, 6);
        this.spawnResourceCluster('oak_tree', { x: 35, y: 0, z: -30 }, 2, 4);
    }
    
    spawnResourceCluster(resourceTypeId, centerPos, radius, count) {
        for (let i = 0; i < count; i++) {
            // Create a random position within the radius of the center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const position = {
                x: centerPos.x + Math.sin(angle) * distance,
                y: centerPos.y,
                z: centerPos.z + Math.cos(angle) * distance
            };
            
            this.spawnResource(resourceTypeId, position);
        }
    }
    
    spawnResource(resourceTypeId, position) {
        const resourceConfig = resourceTypes[resourceTypeId];
        if (!resourceConfig) {
            console.error(`[ResourceManager] Attempted to spawn unknown resource type: ${resourceTypeId}`);
            return null;
        }
        
        const uuid = uuidv4();
        const chunkKey = this.getChunkKeyFromPosition(position);
        
        const resource = {
            uuid,
            resourceTypeId,
            position,
            state: 'available',
            lastHarvestedAt: null,
            respawnTimerId: null,
            chunkKey
        };
        
        this.resources.set(uuid, resource);
        
        // Add to chunk tracking
        if (!this.resourcesByChunk.has(chunkKey)) {
            this.resourcesByChunk.set(chunkKey, []);
        }
        this.resourcesByChunk.get(chunkKey).push(uuid);
        
        return resource;
    }
    
    harvestResource(resourceUuid, playerId) {
        const resource = this.resources.get(resourceUuid);
        if (!resource) return null;
        
        if (resource.state !== 'available') {
            return { success: false, message: 'This resource is not available for harvesting' };
        }
        
        const resourceConfig = resourceTypes[resource.resourceTypeId];
        if (!resourceConfig) return { success: false, message: 'Invalid resource type' };
        
        // Mark as depleted
        resource.state = 'depleted';
        resource.lastHarvestedAt = Date.now();
        
        // Calculate yield amount
        const yieldAmount = this.calculateYieldAmount(resourceConfig.yieldAmount);
        
        // Schedule respawn
        resource.respawnTimerId = setTimeout(() => {
            this.respawnResource(resourceUuid);
        }, resourceConfig.respawnTime);
        
        return {
            success: true,
            resource,
            yield: {
                itemId: resourceConfig.yieldItemId,
                amount: yieldAmount
            },
            xp: resourceConfig.xp
        };
    }
    
    respawnResource(resourceUuid) {
        const resource = this.resources.get(resourceUuid);
        if (!resource) return;
        
        resource.state = 'available';
        resource.lastHarvestedAt = null;
        resource.respawnTimerId = null;
        
        console.log(`[ResourceManager] Resource ${resourceUuid} has respawned`);
        
        // Notify listeners that a resource has respawned
        return resource;
    }
    
    calculateYieldAmount(yieldConfig) {
        if (!yieldConfig) return 1;
        
        const min = yieldConfig.min || 1;
        const max = yieldConfig.max || min;
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    getResourcesInChunk(chunkKey) {
        const resourceIds = this.resourcesByChunk.get(chunkKey) || [];
        const resources = [];
        
        for (const uuid of resourceIds) {
            const resource = this.resources.get(uuid);
            if (resource) {
                resources.push({
                    ...resource,
                    config: resourceTypes[resource.resourceTypeId]
                });
            }
        }
        
        return resources;
    }
    
    getSerializableResource(resource) {
        if (!resource) return null;
        
        const resourceConfig = resourceTypes[resource.resourceTypeId];
        
        return {
            uuid: resource.uuid,
            type: resourceConfig.type,
            resourceTypeId: resource.resourceTypeId,
            name: resourceConfig.name,
            position: resource.position,
            state: resource.state,
            harvestTime: resourceConfig.harvestTime,
            model: resourceConfig.model,
            requiredLevel: resourceConfig.requiredLevel
        };
    }
    
    getChunkKeyFromPosition(position) {
        // Chunk size should match the client's chunk size (32 units)
        const CHUNK_SIZE = 32;
        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        return `${chunkX},${chunkZ}`;
    }
    
    getAllSerializableResources() {
        const serializableResources = [];
        
        this.resources.forEach(resource => {
            serializableResources.push(this.getSerializableResource(resource));
        });
        
        return serializableResources;
    }
    
    getResource(uuid) {
        return this.resources.get(uuid);
    }
}

// Export a singleton instance
const resourceManager = new ResourceManager();
export default resourceManager;
