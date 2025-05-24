// Main application entry point
import { initThreeJS, getScene, getCamera } from './three-setup.js';
import { initNetwork, getSocket, getLocalPlayerId } from './network.js';
import { initChat } from './chat.js';
import { handleTradeRequest, handleTradeRequestResponse } from './tradeSystem.js';
import { World } from './ecs/core.js';
import { createCube, createGround, createPlayer } from './ecs/entities.js';
import { createBasicItem } from './ecs/inventoryEntities.js';
import { RenderSystem, RotationSystem, MovementSystem } from './ecs/systems.js';
import { CameraSystem } from './ecs/cameraSystem.js';
import { ChatBubbleSystem } from './ecs/chatBubbleSystem.js';
import { InventorySystem } from './ecs/inventorySystem.js';
import { ContextMenuSystem } from './ecs/contextMenuSystem.js';
import { getContextMenuManager } from './contextMenu.js';
import { InventoryComponent } from './ecs/inventoryComponents.js';
import { updatePlayerEntityMeshes } from './ecs/playerEntityHelper.js';

// Initialize the ECS world
const world = new World();

// Player entities map to track players by ID
const playerEntities = new Map();
const worldItemEntities = new Map(); // To track world item entities by UUID

// Initialize modules
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Three.js
    initThreeJS();
    const scene = getScene();
    
    // Listen for when the local player ID is assigned by the network module
    console.log("[App.js] Setting up 'local-player-id-assigned' event listener...");
    document.addEventListener('local-player-id-assigned', (event) => {
        const { playerId } = event.detail;
        if (!playerEntities.has(playerId)) {
            console.log(`[App.js 'local-player-id-assigned'] Preemptively creating local player entity: ${playerId}`);
            const localPlayerEntity = createPlayer(world, {
                playerId: playerId,
                username: 'LocalPlayer', // Temporary username, will be updated
                isLocalPlayer: true,
                color: '#00FF00', // Default color
                position: { x: 0, y: 0.5, z: 0 } // Default position
            });
            localPlayerEntity.addComponent(new InventoryComponent());
            playerEntities.set(playerId, localPlayerEntity);
            const checkComp = localPlayerEntity.getComponent(InventoryComponent);
            console.log(`[App.js 'local-player-id-assigned'] Added InventoryComponent to ${playerId}. Immediately retrieved: ${checkComp ? 'Found' : 'NOT Found'}`);
        } else {
            console.log(`[App.js 'local-player-id-assigned'] Local player entity ${playerId} already exists.`);
        }
    });
    console.log("[App.js] 'local-player-id-assigned' event listener IS NOW SET UP.");

    // Initialize networking
    console.log("[App.js] Initializing network...");
    initNetwork();
    const socket = getSocket();
    
    // Initialize chat system
    initChat(socket);

    // Create a cube entity using ECS
    const cube = createCube(world, { position: { x: 0, y: 1, z: 0 } });
    
    // Create a ground plane for players to move on
    const ground = createGround(world, { width: 20, height: 20 });
    
    // World items will be created from server data
    
    // Register systems
    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new RotationSystem(socket));
    world.registerSystem(new MovementSystem(socket));
    world.registerSystem(new ChatBubbleSystem(scene));
    world.registerSystem(new InventorySystem(socket));
    world.registerSystem(new CameraSystem());
    world.registerSystem(new ContextMenuSystem(socket));
    
    // Set up initial camera position for isometric view
    const camera = getCamera();
    camera.position.set(15, 10, 15); // Position for 45-degree isometric view
    camera.lookAt(0, 0, 0);
    
    // Handle players list from server
    document.addEventListener('players-list', (event) => {
        const players = event.detail;
        console.log('[App.js] Received players-list:', players);
        const localId = getLocalPlayerId();

        players.forEach(player => {
            const isLocal = player.id === localId;
            let playerEntity = playerEntities.get(player.id);

            if (playerEntity) {
                // Player entity already exists, update its properties
                console.log(`[App.js 'players-list'] Player ${player.id} (isLocal: ${isLocal}) already exists. Updating.`);
                // Example: Update position if a TransformComponent exists
                const transform = playerEntity.getComponent('TransformComponent'); // Assuming component name
                if (transform && player.position) {
                    transform.position.set(player.position.x, player.position.y, player.position.z);
                }
                // Update other properties like username, color as needed
                // For local player, ensure InventoryComponent exists (should be added by 'local-player-id-assigned')
                if (isLocal && !playerEntity.getComponent(InventoryComponent)) {
                    console.warn(`[App.js 'players-list'] Local player ${player.id} was missing InventoryComponent. Adding it now.`);
                    playerEntity.addComponent(new InventoryComponent());
                }
            } else {
                // Player entity does not exist, create it
                console.log(`[App.js 'players-list'] Creating new player entity for ${player.id} (isLocal: ${isLocal}).`);
                playerEntity = createPlayer(world, {
                    playerId: player.id,
                    username: player.username,
                    isLocalPlayer: isLocal,
                    color: player.color,
                    position: player.position
                });
                playerEntity.addComponent(new InventoryComponent());
                playerEntities.set(player.id, playerEntity);
                const checkComp = playerEntity.getComponent(InventoryComponent);
                console.log(`[App.js 'players-list'] Added InventoryComponent to new player ${player.id}. Immediately retrieved: ${checkComp ? 'Found' : 'NOT Found'}`);
            }
        });
    });

    // Handle new player joined
    document.addEventListener('player-joined', (event) => {
        const player = event.detail;
        console.log('[App.js] Received player-joined:', player);
        const localId = getLocalPlayerId();
        const isLocal = player.id === localId;
        let playerEntity = playerEntities.get(player.id);

        if (playerEntity) {
            console.log(`[App.js 'player-joined'] Player ${player.id} (isLocal: ${isLocal}) already exists. Updating properties.`);
            // Update properties similar to 'players-list'
            const transform = playerEntity.getComponent('TransformComponent'); 
            if (transform && player.position) {
                transform.position.set(player.position.x, player.position.y, player.position.z);
            }
            // Ensure InventoryComponent for local player
            if (isLocal && !playerEntity.getComponent('InventoryComponent')) {
                console.warn(`[App.js 'player-joined'] Local player ${player.id} was missing InventoryComponent. Adding it now.`);
                
                // Check if we have pending inventory data
                if (window.pendingInventory) {
                    console.log(`[App.js] Using pending inventory data for player ${player.id}:`, window.pendingInventory);
                    playerEntity.addComponent(new InventoryComponent({ slots: window.pendingInventory }));
                    window.pendingInventory = null; // Clear pending data
                } else {
                    // Initialize with empty inventory - server will send proper data
                    playerEntity.addComponent(new InventoryComponent());
                }
                
                // Request inventory refresh
                document.dispatchEvent(new CustomEvent('inventory-display-update'));
                
                // Request inventory data from server to ensure we're synchronized
                if (getSocket()) {
                    console.log(`[App.js] Requesting inventory data from server for player ${player.id}`);
                    getSocket().emit('request inventory', { playerId: player.id });
                }
            }
        } else {
            console.log(`[App.js 'player-joined'] Creating new player entity for ${player.id} (isLocal: ${isLocal}).`);
            playerEntity = createPlayer(world, {
                playerId: player.id,
                username: player.username,
                isLocalPlayer: isLocal,
                color: player.color,
                position: player.position
            });
            
            // Initialize inventory component
            if (isLocal && window.pendingInventory) {
                // If we have pending inventory data (received before player entity created)
                console.log(`[App.js] Using pending inventory data for new player ${player.id}:`, window.pendingInventory);
                playerEntity.addComponent(new InventoryComponent({ slots: window.pendingInventory }));
                window.pendingInventory = null; // Clear pending data
            } else {
                // Initialize with empty inventory - server will send proper data
                playerEntity.addComponent(new InventoryComponent());
            }
            
            playerEntities.set(player.id, playerEntity);
            const checkComp = playerEntity.getComponent('InventoryComponent');
            console.log(`[App.js 'player-joined'] Added InventoryComponent to new player ${player.id}. Immediately retrieved: ${checkComp ? 'Found' : 'NOT Found'}`);
        }

        if (isLocal) {
            console.log('[App.js] Local player entity processed/updated via player-joined:', player.id);
            // Request inventory display update to ensure UI is refreshed
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('inventory-display-update'));
            }, 100); // Small delay to ensure entity is fully initialized
        }
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
    
    // Handle initial player inventory data
    document.addEventListener('player-inventory-update', (event) => {
        const inventoryData = event.detail; // This is the array of items or nulls
        const localId = getLocalPlayerId();
        console.log(`[App.js] 'player-inventory-update' received for player ${localId}:`, inventoryData);
        
        const localPlayerEntity = playerEntities.get(localId);
        if (localPlayerEntity) {
            const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
            if (inventoryComponent) {
                console.log('[App.js] Found InventoryComponent, updating slots with received data');
                inventoryComponent.slots = inventoryData; // Directly replace slots
                console.log('[App.js] Local player inventory initialized:', JSON.stringify(inventoryComponent.slots));
                // Dispatch event for UI refresh
                document.dispatchEvent(new CustomEvent('inventory-display-update'));
            } else {
                console.error('[App.js] Local player entity does not have InventoryComponent, adding it now');
                localPlayerEntity.addComponent(new InventoryComponent({ slots: inventoryData }));
                document.dispatchEvent(new CustomEvent('inventory-display-update'));
            }
        } else {
            console.warn(`[App.js] Received player-inventory-update but local player entity (${localId}) not found`);
            // Store inventory data to be applied when the player entity is created
            window.pendingInventory = inventoryData;
        }
    });

    // Handle local player inventory changes (after pickup, drop, move)
    document.addEventListener('local-inventory-changed', (event) => {
        const updateData = event.detail; // { inventory: newInventoryArray, item: optionalPickedUpItem, message: statusMessage }
        console.log("[App.js] 'local-inventory-changed' event received. Detail:", updateData);
        const localId = getLocalPlayerId();
        console.log("[App.js] 'local-inventory-changed': localId is:", localId);

        // Show status message if available
        if (updateData.message) {
            const statusElement = document.getElementById('status-message');
            if (statusElement) {
                statusElement.textContent = updateData.message;
                statusElement.classList.add('show');
                setTimeout(() => statusElement.classList.remove('show'), 2000);
            } else {
                // Create status element if it doesn't exist
                const statusDiv = document.createElement('div');
                statusDiv.id = 'status-message';
                statusDiv.textContent = updateData.message;
                statusDiv.style.position = 'fixed';
                statusDiv.style.bottom = '20px';
                statusDiv.style.left = '50%';
                statusDiv.style.transform = 'translateX(-50%)';
                statusDiv.style.background = 'rgba(0,0,0,0.7)';
                statusDiv.style.color = 'white';
                statusDiv.style.padding = '10px 20px';
                statusDiv.style.borderRadius = '5px';
                statusDiv.style.zIndex = '1000';
                statusDiv.classList.add('show');
                document.body.appendChild(statusDiv);
                setTimeout(() => statusDiv.classList.remove('show'), 2000);
            }
        }

        const localPlayerEntity = playerEntities.get(localId);
        if (localPlayerEntity) {
            // Use string lookup for component to be consistent
            const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
            if (inventoryComponent) {
                console.log('[App.js] Updating inventory with:', updateData.inventory);
                // Check if we're getting a full inventory or just updates
                if (Array.isArray(updateData.inventory)) {
                    inventoryComponent.slots = updateData.inventory; // Update with the new full inventory
                } else if (updateData.slotIndex !== undefined) {
                    // Handle individual slot updates
                    inventoryComponent.slots[updateData.slotIndex] = updateData.item || null;
                }
                
                console.log('[App.js] Local player inventory updated:', JSON.stringify(inventoryComponent.slots));
                if (updateData.item) {
                    console.log('[App.js] Item involved in update:', updateData.item.name);
                }
                // Dispatch event for UI refresh with slight delay to ensure state is updated
                setTimeout(() => {
                    document.dispatchEvent(new CustomEvent('inventory-display-update'));
                }, 50);
            } else {
                console.error("[App.js] 'local-inventory-changed': Local player found, but no InventoryComponent. Adding it now.");
                // If somehow the component is missing, add it with the updated inventory
                const newInventory = Array.isArray(updateData.inventory) ? updateData.inventory : Array(28).fill(null);
                localPlayerEntity.addComponent(new InventoryComponent({ slots: newInventory }));
                document.dispatchEvent(new CustomEvent('inventory-display-update'));
            }
        } else {
            console.warn("[App.js] 'local-inventory-changed': localPlayerEntity not found in playerEntities map for ID:", localId);
        }
    });

    // Handle initial world items state
    document.addEventListener('world-items-state-update', (event) => {
        const items = event.detail; // Array of item objects from server
        console.log('Received world items state update:', items);

        worldItemEntities.forEach(entity => entity.deactivate());
        worldItemEntities.clear();

        items.forEach(itemData => {
            if (!itemData.uuid) {
                console.error("World item data missing uuid:", itemData);
                return;
            }
            const itemEntity = createBasicItem(world, {
                uuid: itemData.uuid,
                id: itemData.id,
                name: itemData.name,
                description: itemData.description,
                position: itemData.position
            });
            worldItemEntities.set(itemData.uuid, itemEntity);
        });
        console.log('World items created/updated:', worldItemEntities.size);
    });

    // Handle a single item being removed from the world
    document.addEventListener('world-item-removed', (event) => {
        const { uuid } = event.detail;
        console.log('Received world item removed:', uuid);
        const itemEntity = worldItemEntities.get(uuid);
        if (itemEntity) {
            itemEntity.deactivate(); 
            worldItemEntities.delete(uuid);
            console.log('World item entity removed:', uuid);
        } else {
            console.warn('Attempted to remove non-existent world item entity:', uuid);
        }
    });

    // Handle a single item being added to the world
    document.addEventListener('world-item-added', (event) => {
        const itemData = event.detail;
        console.log('Received world item added:', itemData);
        if (!itemData.uuid) {
            console.error("Added world item data missing uuid:", itemData);
            return;
        }
        if (worldItemEntities.has(itemData.uuid)) {
            console.warn('Attempted to add already existing world item entity:', itemData.uuid);
            return;
        }
        const itemEntity = createBasicItem(world, {
            uuid: itemData.uuid,
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            position: itemData.position
        });
        worldItemEntities.set(itemData.uuid, itemEntity);
        console.log('World item entity added:', itemData.uuid);
    });
    
    // Handle trade requests
    document.addEventListener('trade-request-received', (event) => {
        const data = event.detail;
        const localId = getLocalPlayerId();
        
        // Find local player entity
        const localPlayerEntity = playerEntities.get(localId);
        if (!localPlayerEntity) {
            console.error('[App.js] Could not find local player entity for trade request');
            return;
        }
        
        // Get local player's username from the PlayerComponent
        const localPlayerComponent = localPlayerEntity.getComponent('PlayerComponent');
        if (!localPlayerComponent) {
            console.error('[App.js] Local player entity does not have a PlayerComponent');
            return;
        }
        
        // Handle the trade request
        handleTradeRequest(
            {
                fromPlayerId: data.fromPlayerId,
                fromPlayerName: data.fromPlayerName,
                tradeId: data.tradeId
            },
            getSocket(),
            localId,
            localPlayerComponent.username
        );
    });
    
    // Handle trade request responses
    document.addEventListener('trade-request-response', (event) => {
        const data = event.detail;
        // Handle the trade request response
        handleTradeRequestResponse(data);
    });
    
    // Main animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems
        world.update(performance.now() / 1000);
        
        // Ensure player entities have proper userData for raycasting
        updatePlayerEntityMeshes(world);
    }
    
    // Start the animation loop
    animate();
});
