/**
 * ChunkSystem - Manages loading and unloading chunks based on player position
 * Requests chunks from the server and manages client-side chunk cache
 */

import * as THREE from 'three';
import { System } from '../core/system.js';
import { ChunkComponent, PlayerComponent, TransformComponent } from '../components/index.js';
import { createChunk } from '../entities/createChunkEntity.js';
import { socket } from '../../network.js';
import Logger from '../../utils/logger.js';

export class ChunkSystem extends System {
    /**
     * @param {Object} options - System configuration
     * @param {Number} options.chunkSize - Size of each chunk in world units
     * @param {Number} options.loadDistance - Distance in chunks to load around player
     */
    constructor(options = {}) {
        super();
        
        // Required components for this system
        this.requiredComponents = ['ChunkComponent'];
        
        // Configuration
        this.chunkSize = options.chunkSize || 32;
        this.loadDistance = options.loadDistance || 1; // Number of chunks to load in each direction
        
        // Track loaded chunks by coordinates for quick lookup
        this.loadedChunks = new Map(); // key: "x,y", value: entityId
        
        // Track pending chunk requests to avoid duplicate requests
        this.pendingChunks = new Map(); // key: "x,y", value: timestamp
        
        // Setup socket event listeners for chunk data
        this._setupSocketListeners();
    }
    
    /**
     * Initialize the system with the initial chunk
     * @param {World} world - The ECS world
     */
    init(world) {
        super.init(world);
        
        // Request the initial (0,0) chunk from the server
        this.requestChunkAt(0, 0);
        
        // Listen for player creation events to ensure chunks load for player position
        document.addEventListener('player-joined', (event) => {
            const player = event.detail;
            if (player && player.position) {
                const { chunkX, chunkY } = ChunkComponent.getChunkCoordsFromPosition(
                    { x: player.position.x, y: player.position.y, z: player.position.z },
                    this.chunkSize
                );
                Logger.info(Logger.LogCategories.CHUNK, 'ChunkSystem', `Player joined at position ${player.position.x}, ${player.position.y}, ${player.position.z}, loading chunks around ${chunkX}, ${chunkY}`);
                this.loadChunksAroundPlayer(chunkX, chunkY);
            }
        });
    }
    
    /**
     * Set up socket event listeners for chunk data
     * @private
     */
    _setupSocketListeners() {
        // Listen for chunk data from server
        socket.on('chunk data', (data) => {
            Logger.debug(Logger.LogCategories.CHUNK, 'ChunkSystem', 'Received chunk data', data);
            
            const { chunkX, chunkY, data: chunkData } = data;
            const key = `${chunkX},${chunkY}`;
            
            // Remove from pending requests
            this.pendingChunks.delete(key);
            
            // Create the chunk entity if not already loaded
            if (!this.loadedChunks.has(key) && chunkData) {
                this.createChunkFromData(chunkX, chunkY, chunkData);
            } else if (!chunkData) {
                Logger.error(Logger.LogCategories.CHUNK, 'ChunkSystem', `Received invalid chunk data for ${chunkX}, ${chunkY}`);
            }
        });
        
        // Listen for multiple chunks data response
        socket.on('chunks data', (data) => {
            const { chunks } = data;
            Logger.debug(Logger.LogCategories.CHUNK, 'ChunkSystem', `Received data for ${chunks.length} chunks`);
            
            if (this.world) {
                chunks.forEach((chunk) => {
                    const { chunkX, chunkY, data: chunkData } = chunk;
                    
                    // Remove from pending requests
                    this.pendingChunks.delete(`${chunkX},${chunkY}`);
                    
                    // Create the chunk with the received data
                    if (!this.loadedChunks.has(`${chunkX},${chunkY}`)) {
                        this.createChunkFromData(chunkX, chunkY, chunkData);
                    }
                });
            }
        });
        
        // Listen for chunk errors
        socket.on('chunk error', (data) => {
            const { chunkX, chunkY, error } = data;
            Logger.error(Logger.LogCategories.CHUNK, 'ChunkSystem', `Error loading chunk ${chunkX}, ${chunkY}: ${error}`);
            
            // Remove from pending requests
            if (chunkX !== undefined && chunkY !== undefined) {
                this.pendingChunks.delete(`${chunkX},${chunkY}`);
            }
        });
    }
    
    /**
     * Update system during each frame
     * @param {Number} deltaTime - Time since last frame in seconds
     */
    update(world, deltaTime) {
        // Keep reference to world up-to-date each frame
        this.world = world;
        // Only consider the LOCAL player when deciding which chunks to load/unload
        const localPlayers = this.world
            .findEntitiesWith('PlayerComponent')
            .filter((e) => {
                const pc = e.getComponent('PlayerComponent');
                return pc && pc.isLocalPlayer;
            });

        // No local player yet (e.g. still connecting)
        if (localPlayers.length === 0) return;

        // There should only ever be one local player entity
        const playerEntity = localPlayers[0];
        const transform = playerEntity.getComponent('TransformComponent');
        if (!transform) return;

        // Get current player position and derive the chunk we are in
        const position = transform.position;
        const { chunkX, chunkY } = ChunkComponent.getChunkCoordsFromPosition(position, this.chunkSize);

        if (this.debugEnabled) {
            console.debug(`ChunkSystem: LOCAL player at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}) in chunk (${chunkX},${chunkY})`);
        }

        // Store for debugging / external systems
        const playerComponent = playerEntity.getComponent('PlayerComponent');
        if (playerComponent) {
            playerComponent.currentChunkX = chunkX;
            playerComponent.currentChunkY = chunkY;
        }

        // Load/unload chunks relative to the local player's position
        this.loadChunksAroundPlayer(chunkX, chunkY, false);
        this.unloadDistantChunks(chunkX, chunkY);
    }
    
    /**
     * Load chunks in a square around the player
     * @param {Number} centerX - Player's chunk X coordinate
     * @param {Number} centerY - Player's chunk Y coordinate
     * @param {Boolean} immediate - If true, load chunks immediately without delay (for initial player placement)
     */
    loadChunksAroundPlayer(centerX, centerY, immediate = false) {
        // Calculate priority for each chunk based on distance from player
        const chunksToLoad = [];
        
        Logger.debug(Logger.LogCategories.CHUNK, 'ChunkSystem', `Loading chunks around (${centerX}, ${centerY}) with loadDistance=${this.loadDistance}`);
        
        // Load chunks in a square around the player
        for (let x = centerX - this.loadDistance; x <= centerX + this.loadDistance; x++) {
            for (let y = centerY - this.loadDistance; y <= centerY + this.loadDistance; y++) {
                // Skip if already loaded or pending
                const key = `${x},${y}`;
                if (!this.loadedChunks.has(key) && !this.pendingChunks.has(key)) {
                    // Calculate Manhattan distance for priority
                    const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                    chunksToLoad.push({ x, y, distance });
                }
            }
        }
        
        // Sort chunks by distance (closest first)
        chunksToLoad.sort((a, b) => a.distance - b.distance);
        
        // Request chunks with a small delay between each to avoid flooding the server
        // For immediate loading (player login), use a smaller delay
        const delayBetweenRequests = immediate ? 10 : 50; // ms
        
        if (chunksToLoad.length > 0) {
            Logger.debug(Logger.LogCategories.CHUNK, 'ChunkSystem', `Queueing ${chunksToLoad.length} chunks to load around (${centerX}, ${centerY})`);
        }
        
        chunksToLoad.forEach((chunk, index) => {
            setTimeout(() => {
                this.requestChunkAt(chunk.x, chunk.y);
            }, index * delayBetweenRequests); 
        });
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
        
        // Also clean up any stale pending chunk requests
        // (requests that have been pending for too long)
        const now = Date.now();
        const timeout = 10000; // 10 seconds
        
        for (const [key, timestamp] of this.pendingChunks.entries()) {
            if (now - timestamp > timeout) {
                Logger.warn(Logger.LogCategories.CHUNK, 'ChunkSystem', `Cleaning up stale pending chunk request: ${key}`);
                this.pendingChunks.delete(key);
            }
        }
    }
    
    /**
     * Request a chunk from the server
     * @param {Number} chunkX - Chunk X coordinate
     * @param {Number} chunkY - Chunk Y coordinate
     */
    requestChunkAt(chunkX, chunkY) {
        // Request chunk data from server
        this.requestChunk(chunkX, chunkY);
    }
    
    requestChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        
        // Check if we already have this chunk or if it's pending
        if (this.loadedChunks.has(key) || this.pendingChunks.has(key)) {
            return;
        }
        
        Logger.debug(Logger.LogCategories.CHUNK, 'ChunkSystem', `Requesting chunk data for ${chunkX}, ${chunkY}`);
        
        // Mark as pending with current timestamp
        this.pendingChunks.set(key, Date.now());
        
        // Request from server
        socket.emit('request chunk', { chunkX, chunkY });
        
        // Set a timeout to handle cases where the server doesn't respond
        setTimeout(() => {
            if (this.pendingChunks.has(key)) {
                Logger.error(Logger.LogCategories.CHUNK, 'ChunkSystem', `Timeout waiting for chunk ${chunkX}, ${chunkY} from server`);
                this.pendingChunks.delete(key);
            }
        }, 5000); // 5 second timeout
    }
    
    /**
     * Create a chunk from server data
     * @param {Number} chunkX - Chunk X coordinate
     * @param {Number} chunkY - Chunk Y coordinate
     * @param {Object} chunkData - Chunk data from server
     * @returns {Entity|null} - The created chunk entity or null if creation failed
     */
    createChunkFromData(chunkX, chunkY, chunkData) {
        const key = `${chunkX},${chunkY}`;
        
        // Check if already loaded
        if (this.loadedChunks.has(key)) {
            return this.world.getEntityById(this.loadedChunks.get(key));
        }
        
        if (!chunkData) {
            Logger.error(Logger.LogCategories.CHUNK, 'ChunkSystem', `Cannot create chunk at ${chunkX}, ${chunkY} - invalid chunk data`);
            return null;
        }
        
        // Create the chunk entity with server data
        const chunkEntity = createChunk(this.world, { 
            chunkX, 
            chunkY, 
            size: this.chunkSize,
            serverData: chunkData // Pass the server data to the chunk creation function
        });
        
        // Make sure chunk entity was created successfully
        if (!chunkEntity) {
            Logger.error(Logger.LogCategories.CHUNK, 'ChunkSystem', `Failed to create chunk entity at ${chunkX}, ${chunkY}`);
            return null;
        }
        
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
        
        const chunkComponent = entity.getComponent('ChunkComponent');
        if (!chunkComponent) return;
        
        // Mark all child entities as inactive so other systems (e.g. RenderSystem)
        // can properly dispose of their meshes before the World purges them.
        for (const childEntityId of chunkComponent.entities) {
            const child = this.world.getEntityById(childEntityId);
            if (child) {
                // Proactively remove any meshes from the scene right now. This saves
                // us from relying on RenderSystem running after ChunkSystem.
                if (child.hasComponent('MeshComponent')) {
                    const meshComp = child.getComponent('MeshComponent');
                    if (meshComp.mesh && meshComp.mesh.parent) {
                        meshComp.mesh.parent.remove(meshComp.mesh);
                        meshComp.addedToScene = false;
                    }
                }
                child.active = false;
            }
        }

        // Mark the chunk entity itself as inactive
        entity.active = false;
        
        // Remove from tracking map
        this.loadedChunks.delete(key);
        
        Logger.info(Logger.LogCategories.CHUNK, 'ChunkSystem', `Unloaded chunk: ${key}`);
    }
}
