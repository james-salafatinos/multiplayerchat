// Main application entry point
import { initThreeJS, getScene } from './three-setup.js';
import { initNetwork, getSocket } from './network.js';
import { initChat } from './chat.js';
import { World } from './ecs/core.js';
import { createCube } from './ecs/entities.js';
import { RenderSystem, RotationSystem } from './ecs/systems.js';

// Initialize the ECS world
const world = new World();

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
    const cube = createCube(world);
    
    // Register systems
    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new RotationSystem(socket));
    
    // Main animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems
        world.update(performance.now() / 1000);
    }
    
    // Start the animation loop
    animate();
});
