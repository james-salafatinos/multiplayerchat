// server/utils/generateWorldChunks.js
// Utility script to generate initial world chunk files

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to chunk data files
const CHUNKS_DIR = join(__dirname, '../config/world');

// Ensure the world directory exists
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

/**
 * Noise function for natural object placement
 * Same as the one used in client-side code for compatibility
 */
function noise(x, y) {
  return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
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
  
  return chunk;
}

/**
 * Generate and save a chunk file
 * @param {Number} chunkX - X coordinate of the chunk
 * @param {Number} chunkY - Y coordinate of the chunk
 */
function generateAndSaveChunk(chunkX, chunkY) {
  const chunk = generateChunk(chunkX, chunkY);
  const chunkPath = join(CHUNKS_DIR, `chunk_${chunkX}_${chunkY}.json`);
  
  fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
  console.log(`Generated chunk at ${chunkX}, ${chunkY}`);
}

/**
 * Generate a grid of chunks
 * @param {Number} startX - Starting X coordinate
 * @param {Number} startY - Starting Y coordinate
 * @param {Number} width - Number of chunks in X direction
 * @param {Number} height - Number of chunks in Y direction
 */
function generateChunkGrid(startX, startY, width, height) {
  console.log(`Generating ${width}x${height} chunk grid starting at ${startX}, ${startY}`);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const chunkX = startX + x;
      const chunkY = startY + y;
      generateAndSaveChunk(chunkX, chunkY);
    }
  }
  
  console.log(`Generated ${width * height} chunks`);
}

// Generate a 5x5 grid of chunks centered at 0,0
generateChunkGrid(-2, -2, 5, 5);

console.log('World generation complete!');
