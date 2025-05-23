// Chat Bubble System
// Manages chat bubbles displayed above player heads

import { System } from './core.js';
import { ChatBubbleComponent } from './components.js';
import { getCamera, getRenderer } from '../three-setup.js';
import * as THREE from 'three';

/**
 * ChatBubble System
 * Manages chat bubbles displayed above player heads using HTML overlays
 */
export class ChatBubbleSystem extends System {
    constructor(scene) {
        super();
        this.requiredComponents = ['ChatBubbleComponent', 'TransformComponent', 'PlayerComponent'];
        this.scene = scene;
        this.camera = getCamera();
        this.renderer = getRenderer();
        
        // Create container for chat bubbles if it doesn't exist
        this.createChatBubbleContainer();
        
        // Listen for chat message events
        document.addEventListener('player-chat-message', (event) => {
            console.log('ChatBubbleSystem received player-chat-message event:', event.detail);
            this.handleChatMessage(event.detail);
        });
        
        console.log('ChatBubbleSystem initialized and listening for player-chat-message events');
    }
    
    /**
     * Create a container for chat bubbles in the DOM
     */
    createChatBubbleContainer() {
        // Check if container already exists
        let container = document.getElementById('chat-bubbles-container');
        if (!container) {
            // Create container
            container = document.createElement('div');
            container.id = 'chat-bubbles-container';
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none';
            container.style.overflow = 'hidden';
            container.style.zIndex = '10';
            
            // Add to DOM
            document.body.appendChild(container);
            console.log('Created chat bubbles container');
        }
    }
    
    /**
     * Handle a new chat message
     * @param {Object} data - The chat message data
     */
    handleChatMessage(data) {
        console.log('Handling chat message for bubble:', data);
        
        // Find the player entity with the matching ID
        for (const entity of this.world.entities) {
            if (entity.hasComponent('PlayerComponent')) {
                const playerComponent = entity.getComponent('PlayerComponent');
                
                // Check if this is the player who sent the message
                if (playerComponent.playerId === data.playerId) {
                    console.log('Found player entity for chat bubble:', playerComponent.playerId);
                    
                    // Add or update ChatBubbleComponent
                    if (entity.hasComponent('ChatBubbleComponent')) {
                        // Update existing component
                        const chatComponent = entity.getComponent('ChatBubbleComponent');
                        chatComponent.message = data.content;
                        chatComponent.username = data.username;
                        chatComponent.timestamp = Date.now();
                        chatComponent.timeRemaining = chatComponent.duration;
                        chatComponent.isVisible = true;
                        
                        // Remove old element if it exists
                        if (chatComponent.element && chatComponent.element.parentNode) {
                            chatComponent.element.parentNode.removeChild(chatComponent.element);
                        }
                        
                        // Create new bubble element
                        this.createChatBubbleElement(entity);
                    } else {
                        // Add new component
                        const chatComponent = new ChatBubbleComponent({
                            message: data.content,
                            username: data.username,
                            timestamp: Date.now(),
                            duration: 4, // 2 seconds display time
                            isVisible: true
                        });
                        entity.addComponent(chatComponent);
                        
                        // Create bubble element
                        this.createChatBubbleElement(entity);
                    }
                    
                    break;
                }
            }
        }
    }
    
    /**
     * Create a chat bubble HTML element for an entity
     * @param {Entity} entity - The entity to create a chat bubble for
     */
    createChatBubbleElement(entity) {
        const chatComponent = entity.getComponent('ChatBubbleComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        
        // Create bubble element
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.style.position = 'absolute';
        bubble.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        bubble.style.borderRadius = '5px';
        bubble.style.padding = '5px 10px';
        bubble.style.maxWidth = '500px';
        bubble.style.textAlign = 'center';
        bubble.style.transform = 'translate(-50%, -100%)';
        bubble.style.pointerEvents = 'none';
        bubble.style.zIndex = '100';
        bubble.style.fontSize = '14px';
        bubble.style.color = '#000';
        bubble.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        bubble.textContent = chatComponent.message;
        
        // Add to container
        const container = document.getElementById('chat-bubbles-container');
        container.appendChild(bubble);
        
        // Store reference to element
        chatComponent.element = bubble;
        
        // Update position initially
        this.updateChatBubblePosition(entity);
    }
    
    /**
     * Update the position of a chat bubble to follow its entity
     * @param {Entity} entity - The entity with the chat bubble
     */
    updateChatBubblePosition(entity) {
        const chatComponent = entity.getComponent('ChatBubbleComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        
        // Skip if no element or not visible
        if (!chatComponent.element || !chatComponent.isVisible) {
            console.log('Skipping position update - element not visible or missing');
            return;
        }
        
        // Get the mesh from the entity to find its world position
        const meshComponent = entity.getComponent('MeshComponent');
        if (!meshComponent || !meshComponent.mesh) {
            console.log('Entity has no mesh component or mesh');
            return;
        }
        
        // Get the world position of the player mesh
        // For a player, we want to position at the top of their head
        const playerHeight = 1.0; // Assuming player height is 1.0 units
        
        // Create a position vector at the top center of the player's head
        const worldPos = new THREE.Vector3();
        meshComponent.mesh.getWorldPosition(worldPos);
        worldPos.y += playerHeight / 2 + 0.1; // Position at top of head plus small offset
        
        // Convert world position to screen position
        // Using the renderer's coordinates for more accurate positioning
        const tempV = worldPos.clone();
        tempV.project(this.camera);
        
        // Get the renderer dimensions
        const rendererSize = this.renderer.getSize(new THREE.Vector2());
        
        // Convert normalized device coordinates (-1 to +1) to pixel coordinates
        const x = Math.round((0.5 + tempV.x / 2) * rendererSize.x);
        const y = Math.round((0.5 - tempV.y / 2) * rendererSize.y);
        
        console.log(`Updating chat bubble position to x:${x}, y:${y} for message: "${chatComponent.message}"`);
        
        // Update element position
        chatComponent.element.style.left = `${x}px`;
        chatComponent.element.style.top = `${y}px`;
        
        // Make sure the element is visible
        chatComponent.element.style.display = 'block';
        chatComponent.element.style.opacity = '1';
    }
    
    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        const chatComponent = entity.getComponent('ChatBubbleComponent');
        
        // Skip if not visible
        if (!chatComponent.isVisible) return;
        
        // Update bubble position
        this.updateChatBubblePosition(entity);
        
        // Update time remaining
        chatComponent.timeRemaining -= deltaTime;
        
        // Hide if time expired
        if (chatComponent.timeRemaining <= 0) {
            chatComponent.isVisible = false;
            
            // Remove element from DOM
            if (chatComponent.element && chatComponent.element.parentNode) {
                chatComponent.element.parentNode.removeChild(chatComponent.element);
                chatComponent.element = null;
            }
        }
    }
    
    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(world, deltaTime) {
        // Store reference to world for use in event handlers
        this.world = world;
        
        // Process all matching entities
        super.update(world, deltaTime);
    }
}
