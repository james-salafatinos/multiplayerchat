/**
 * ChunkSystem - Manages loading and unloading chunks based on player position
 */

import * as THREE from 'three';
import { System } from '../core/system.js';
import { ChunkComponent, PlayerComponent, TransformComponent } from '../components/index.js';
import { createChunk } from '../entities/createChunkEntity.js';

export class ChunkSystem extends System {
    /**
     * @param {Object} options - System configuration
     * @param {Number} options.chunkSize - Size of each chunk in world units
     * @param {Number} options.loadDistance - Distance in chunks to load around player
     */
    constructor(options = {}) {
        super();
        
        // Required components for this system
        this.requiredComponents = [ChunkComponent];
        
        // Configuration
        this.chunkSize = options.chunkSize || 32;
        this.loadDistance = options.loadDistance || 1; // Number of chunks to load in each direction
        
        // Track loaded chunks by coordinates for quick lookup
        this.loadedChunks = new Map(); // key: "x,y", value: entityId
    }
    
    /**
     * Initialize the system with the initial chunk
     * @param {World} world - The ECS world
     */
    init(world) {
        super.init(world);
        
        // Create the initial (0,0) chunk
        this.createChunkAt(0, 0);
    }
    
    /**
     * Update system during each frame
     * @param {Number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Find player entities
        const playerEntities = this.world.findEntitiesWith('PlayerComponent');
        
        // No players to process
        if (playerEntities.length === 0) return;
        
        // Process each player
        for (const playerEntity of playerEntities) {
            const transform = playerEntity.getComponent(TransformComponent);
            if (!transform) continue;
            
            // Get current player position
            const position = transform.position;
            
            // Calculate which chunk the player is in
            const { chunkX, chunkY } = ChunkComponent.getChunkCoordsFromPosition(position, this.chunkSize);
            
            // Load chunks around player
            this.loadChunksAroundPlayer(chunkX, chunkY);
            
            // Unload distant chunks
            this.unloadDistantChunks(chunkX, chunkY);
        }
    }
    
    /**
     * Load chunks in a square around the player
     * @param {Number} centerX - Player's chunk X coordinate
     * @param {Number} centerY - Player's chunk Y coordinate
     */
    loadChunksAroundPlayer(centerX, centerY) {
        for (let x = centerX - this.loadDistance; x <= centerX + this.loadDistance; x++) {
            for (let y = centerY - this.loadDistance; y <= centerY + this.loadDistance; y++) {
                const key = `${x},${y}`;
                
                // Skip if chunk is already loaded
                if (this.loadedChunks.has(key)) continue;
                
                // Create and load the chunk
                this.createChunkAt(x, y);
            }
        }
    }
    
    /**
     * Unload chunks that are too far from any player
     * @param {Number} playerChunkX - Player's chunk X coordinate
     * @param {Number} playerChunkY - Player's chunk Y coordinate
     */
    unloadDistantChunks(playerChunkX, playerChunkY) {
        // Check all loaded chunks
        for (const [key, entityId] of this.loadedChunks.entries()) {
            const [chunkX, chunkY] = key.split(',').map(Number);
            
            // Check if chunk is outside load distance
            const distX = Math.abs(chunkX - playerChunkX);
            const distY = Math.abs(chunkY - playerChunkY);
            
            // Unload if outside the load distance
            // Use a buffer to prevent frequent loading/unloading at the edge
            if (Math.max(distX, distY) > this.loadDistance + 1) {
                this.unloadChunk(entityId, key);
            }
        }
    }
    
    /**
     * Create a new chunk at the specified coordinates
     * @param {Number} chunkX - Chunk X coordinate
     * @param {Number} chunkY - Chunk Y coordinate
     * @returns {Entity} - The created chunk entity
     */
    createChunkAt(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        
        // Check if already loaded
        if (this.loadedChunks.has(key)) {
            return this.world.getEntityById(this.loadedChunks.get(key));
        }
        
        // Create the chunk entity
        const chunkEntity = createChunk(this.world, { 
            chunkX, 
            chunkY, 
            size: this.chunkSize 
        });
        
        // Track the loaded chunk
        this.loadedChunks.set(key, chunkEntity.id);
        
        return chunkEntity;
    }
    
    /**
     * Unload a chunk by entity ID
     * @param {Number} entityId - ID of the chunk entity to unload
     * @param {String} key - Map key for the chunk (format: "x,y")
     */
    unloadChunk(entityId, key) {
        // Get the chunk component
        const entity = this.world.getEntityById(entityId);
        if (!entity) return;
        
        const chunkComponent = entity.getComponent(ChunkComponent);
        if (!chunkComponent) return;
        
        // Remove all entities in this chunk
        for (const childEntityId of chunkComponent.entities) {
            this.world.removeEntity(childEntityId);
        }
        
        // Remove the chunk entity from the world
        this.world.removeEntity(entityId);
        
        // Remove from tracking map
        this.loadedChunks.delete(key);
        
        console.log(`Unloaded chunk: ${key}`);
    }
}
