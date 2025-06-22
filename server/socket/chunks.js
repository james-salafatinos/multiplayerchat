// server/socket/chunks.js
// Socket.io handlers for chunk-related events

/**
 * Initialize chunk-related socket handlers
 * @param {Object} io - The socket.io server instance
 * @param {Object} chunkManager - The chunk manager module
 */
export function initChunkHandlers(io, chunkManager) {
  io.on('connection', (socket) => {
    // Handle chunk request from client
    socket.on('request chunk', async (data) => {
      try {
        const { chunkX, chunkY } = data;
        
        console.log(`Client ${socket.id} requested chunk at ${chunkX}, ${chunkY}`);
        
        // Load the chunk data from the chunk manager
        const chunkData = chunkManager.loadChunk(chunkX, chunkY);
        
        if (chunkData) {
          // Send the chunk data back to the client
          socket.emit('chunk data', {
            chunkX,
            chunkY,
            data: chunkData
          });
          
          console.log(`Sent chunk ${chunkX}, ${chunkY} to client ${socket.id}`);
        } else {
          // Send error if chunk couldn't be loaded
          socket.emit('chunk error', {
            chunkX,
            chunkY,
            error: 'Failed to load chunk'
          });
          
          console.error(`Failed to load chunk ${chunkX}, ${chunkY} for client ${socket.id}`);
        }
      } catch (error) {
        console.error('Error handling chunk request:', error);
        socket.emit('chunk error', {
          error: 'Server error processing chunk request'
        });
      }
    });
    
    // Handle request for multiple chunks at once (for preloading)
    socket.on('request chunks', async (data) => {
      try {
        const { chunks } = data;
        
        if (!Array.isArray(chunks)) {
          socket.emit('chunk error', {
            error: 'Invalid chunks request format'
          });
          return;
        }
        
        console.log(`Client ${socket.id} requested ${chunks.length} chunks`);
        
        // Process each chunk request
        const chunkResponses = [];
        
        for (const { chunkX, chunkY } of chunks) {
          const chunkData = chunkManager.loadChunk(chunkX, chunkY);
          
          if (chunkData) {
            chunkResponses.push({
              chunkX,
              chunkY,
              data: chunkData
            });
          }
        }
        
        // Send all chunk data back to the client
        socket.emit('chunks data', {
          chunks: chunkResponses
        });
        
        console.log(`Sent ${chunkResponses.length} chunks to client ${socket.id}`);
      } catch (error) {
        console.error('Error handling multiple chunks request:', error);
        socket.emit('chunk error', {
          error: 'Server error processing chunks request'
        });
      }
    });
  });
}

export default initChunkHandlers;
