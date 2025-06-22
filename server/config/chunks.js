// server/config/chunks.js
// Chunk configuration and world map definition

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to chunk data files
const CHUNKS_DIR = join(__dirname, 'world');

// Ensure the world directory exists
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

/**
 * Chunk schema:
 * {
 *   chunkX: Number,       // X coordinate of the chunk
 *   chunkY: Number,       // Y coordinate of the chunk
 *   size: Number,         // Size of the chunk (typically 32)
 *   terrain: String,      // Terrain type (e.g., "grass", "desert", "snow")
 *   objects: [            // Array of objects in this chunk
 *     {
 *       type: String,     // Object type (e.g., "tree", "rock")
 *       x: Number,        // Local X position within chunk (0 to size-1)
 *       y: Number,        // Local Y position within chunk (0 to size-1)
 *       variant: String,  // Optional variant of the object (e.g., "oak", "pine")
 *       scale: Number,    // Optional scale factor
 *       rotation: Number  // Optional rotation in radians
 *     }
 *   ]
 * }
 */

/**
 * Load a specific chunk by coordinates
 * @param {Number} chunkX - X coordinate of the chunk
 * @param {Number} chunkY - Y coordinate of the chunk
 * @returns {Object|null} - Chunk data or null if not found
 */
export function loadChunk(chunkX, chunkY) {
  const chunkPath = join(CHUNKS_DIR, `chunk_${chunkX}_${chunkY}.json`);
  
  try {
    if (fs.existsSync(chunkPath)) {
      const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
      return chunkData;
    }
    
    // If chunk file doesn't exist, generate it
    return generateChunk(chunkX, chunkY);
  } catch (error) {
    console.error(`Error loading chunk at ${chunkX},${chunkY}:`, error);
    return null;
  }
}

/**
 * Generate a chunk with deterministic placement of objects
 * @param {Number} chunkX - X coordinate of the chunk
 * @param {Number} chunkY - Y coordinate of the chunk
 * @returns {Object} - Generated chunk data
 */
function generateChunk(chunkX, chunkY) {
  const size = 32;
  const chunk = {
    chunkX,
    chunkY,
    size,
    terrain: "grass",
    objects: []
  };
  
  // Generate objects using the same noise function as client
  for (let x = 0; x < size; x += 2) {
    for (let y = 0; y < size; y += 2) {
      const noiseVal = noise(chunkX * size + x, chunkY * size + y);
      
      // Skip edges to prevent objects being cut off at chunk boundaries
      if (x < 2 || y < 2 || x >= size - 2 || y >= size - 2) continue;
      
      // 5% chance for a rock
      if (noiseVal > 0.95) {
        chunk.objects.push({
          type: "rock",
          x,
          y,
          scale: 0.7 + Math.random() * 0.4,
          rotation: Math.random() * Math.PI * 2
        });
      } 
      // 10% chance for a tree (if not a rock)
      else if (noiseVal > 0.85) {
        chunk.objects.push({
          type: "tree",
          x,
          y,
          scale: 1 + Math.random() * 0.3,
          rotation: Math.random() * Math.PI * 2
        });
      }
    }
  }
  
  // Save the generated chunk
  const chunkPath = join(CHUNKS_DIR, `chunk_${chunkX}_${chunkY}.json`);
  fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
  
  return chunk;
}

/**
 * Noise function for natural object placement
 * Same as the one used in client-side code for compatibility
 */
function noise(x, y) {
  return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
}

/**
 * Get a list of all available chunks
 * @returns {Array} - Array of chunk coordinates [{chunkX, chunkY}]
 */
export function listAllChunks() {
  try {
    const files = fs.readdirSync(CHUNKS_DIR);
    return files
      .filter(file => file.startsWith('chunk_') && file.endsWith('.json'))
      .map(file => {
        const match = file.match(/chunk_(-?\d+)_(-?\d+)\.json/);
        if (match) {
          return {
            chunkX: parseInt(match[1]),
            chunkY: parseInt(match[2])
          };
        }
        return null;
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error listing chunks:', error);
    return [];
  }
}

export default {
  loadChunk,
  listAllChunks
};
