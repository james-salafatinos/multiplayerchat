// Main application entry point
import { initThreeJS, getScene, getCamera } from './three-setup.js';
import { initNetwork, getSocket, getLocalPlayerId } from './network.js';
import { initChat } from './chat.js';
import { World } from './ecs/core.js';
import { createCube, createGround, createPlayer } from './ecs/entities.js';
import { RenderSystem, RotationSystem, MovementSystem } from './ecs/systems.js';
import { ChatBubbleSystem } from './ecs/chatBubbleSystem.js';

// Initialize the ECS world
const world = new World();

// Player entities map to track players by ID
const playerEntities = new Map();

// Initialize modules
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Three.js
    initThreeJS();
    const scene = getScene();
    
    // Initialize networking
    initNetwork();
    const socket = getSocket();
    
    // Initialize chat system
    initChat(socket);
    
    // Create a cube entity using ECS
    const cube = createCube(world, { position: { x: 0, y: 1, z: 0 } });
    
    // Create a ground plane for players to move on
    const ground = createGround(world, { width: 20, height: 20 });
    
    // Register systems
    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new RotationSystem(socket));
    world.registerSystem(new MovementSystem(socket));
    world.registerSystem(new ChatBubbleSystem(scene));
    
    // Set up camera position for better view
    const camera = getCamera();
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Handle players list from server
    document.addEventListener('players-list', (event) => {
        const players = event.detail;
        
        // Create entities for all players
        players.forEach(player => {
            // Skip if we already have this player
            if (playerEntities.has(player.id)) return;
            
            // Check if this is the local player
            const isLocalPlayer = player.id === getLocalPlayerId();
            
            // Create player entity
            const playerEntity = createPlayer(world, {
                playerId: player.id,
                username: player.username,
                isLocalPlayer: isLocalPlayer,
                color: player.color,
                position: player.position
            });
            
            // Store player entity in map
            playerEntities.set(player.id, playerEntity);
        });
    });
    
    // Handle new player joined
    document.addEventListener('player-joined', (event) => {
        const player = event.detail;
        
        // Skip if we already have this player
        if (playerEntities.has(player.id)) return;
        
        // Create player entity
        const playerEntity = createPlayer(world, {
            playerId: player.id,
            username: player.username,
            isLocalPlayer: false, // Never the local player
            color: player.color,
            position: player.position
        });
        
        // Store player entity in map
        playerEntities.set(player.id, playerEntity);
    });
    
    // Handle player left
    document.addEventListener('player-left', (event) => {
        const { playerId } = event.detail;
        
        // Get player entity
        const playerEntity = playerEntities.get(playerId);
        if (playerEntity) {
            // Deactivate entity
            playerEntity.deactivate();
            
            // Remove from map
            playerEntities.delete(playerId);
        }
    });
    
    // Main animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems
        world.update(performance.now() / 1000);
    }
    
    // Start the animation loop
    animate();
});
