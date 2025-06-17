/**
 * ChunkComponent - Manages a single chunk of the game world
 * Represents a square section of the world grid with a collection of entities
 */

import { Component } from '../core/component.js';

export class ChunkComponent extends Component {
    /**
     * @param {Object} options - Chunk configuration
     * @param {Number} options.chunkX - X coordinate of this chunk in the world chunk grid
     * @param {Number} options.chunkY - Y coordinate of this chunk in the world chunk grid
     * @param {Number} options.size - Size of this chunk (e.g., 32 for a 32x32 chunk)
     * @param {Boolean} options.loaded - Whether this chunk is currently loaded
     * @param {Array} options.entities - Array of entity IDs contained in this chunk
     */
    constructor(options = {}) {
        super();
        
        this.chunkX = options.chunkX || 0;
        this.chunkY = options.chunkY || 0;
        this.size = options.size || 32;
        this.loaded = options.loaded !== undefined ? options.loaded : false;
        this.entities = options.entities || [];
        
        // Computed world space boundaries for quick position checks
        this.worldMinX = this.chunkX * this.size;
        this.worldMaxX = (this.chunkX + 1) * this.size;
        this.worldMinY = this.chunkY * this.size;
        this.worldMaxY = (this.chunkY + 1) * this.size;
    }
    
    /**
     * Add entity to this chunk
     * @param {Number} entityId - ID of the entity to add to this chunk
     */
    addEntity(entityId) {
        if (!this.entities.includes(entityId)) {
            this.entities.push(entityId);
        }
    }
    
    /**
     * Remove entity from this chunk
     * @param {Number} entityId - ID of the entity to remove from this chunk
     */
    removeEntity(entityId) {
        const index = this.entities.indexOf(entityId);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }
    
    /**
     * Check if a world position is contained within this chunk
     * @param {THREE.Vector3} position - Position to check
     * @returns {Boolean} - True if the position is within this chunk
     */
    containsPosition(position) {
        return position.x >= this.worldMinX && 
               position.x < this.worldMaxX && 
               position.z >= this.worldMinY && 
               position.z < this.worldMaxY;
    }
    
    /**
     * Get chunk coordinates from world position
     * @param {THREE.Vector3} position - World position
     * @param {Number} chunkSize - Size of chunks
     * @returns {Object} - Object with chunkX and chunkY properties
     */
    static getChunkCoordsFromPosition(position, chunkSize = 32) {
        const chunkX = Math.floor(position.x / chunkSize);
        const chunkY = Math.floor(position.z / chunkSize);
        return { chunkX, chunkY };
    }
}
