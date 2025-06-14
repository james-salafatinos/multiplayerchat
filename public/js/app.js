// Main application entry point
import { initThreeJS, getScene, getCamera } from './three-setup.js';
import { initNetwork, getSocket, getLocalPlayerId } from './network.js';
import { getCurrentUser } from './auth/auth.js';
import { initChat } from './chat.js';
import { handleTradeRequest, handleTradeRequestResponse } from './trade/index.js';
import { initAdminPanel } from './admin/adminPanel.js';
import { World } from './ecs/core/index.js';
import { createCubeEntity, createGroundEntity, createPlayerEntity } from './ecs/entities/index.js';
import { createBasicItemEntity } from './ecs/entities/index.js';

import { RenderSystem, RotationSystem, MovementSystem, CharacterSystem } from './ecs/systems/index.js'; // Added CharacterSystem
import { CameraSystem, ChatBubbleSystem, ContextMenuSystem  } from './ecs/systems/index.js';
import { InventorySystem } from './ecs/systems/index.js';
import { SkillsSystem } from './ecs/systems/index.js';
import { InventoryComponent, CharacterControllerComponent } from './ecs/components/index.js'; // Added CharacterControllerComponent
import { SkillsComponent } from './ecs/components/index.js';
import { updatePlayerEntityMeshes } from './ecs/playerEntityHelper.js';
import { initDebugModule } from './debug.js';



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
    const camera = getCamera(); // Added for completeness, though not directly used in color logic yet

    // Color Picker Element
    const colorPicker = document.getElementById('player-color-picker');
    
    // Listen for when the local player ID is assigned by the network module
    console.log("[App.js] Setting up 'local-player-id-assigned' event listener...");
    document.addEventListener('local-player-id-assigned', (event) => {
        const { playerId } = event.detail;
        if (!playerEntities.has(playerId)) {
            console.log(`[App.js 'local-player-id-assigned'] Preemptively creating local player entity: ${playerId}`);
            const localPlayerEntity = createPlayerEntity(world, scene, {
                playerId: playerId,
                username: 'LocalPlayer', // Temporary username, will be updated
                isLocalPlayer: true,
                position: { x: 0, y: 0.5, z: 0 } // Default position
            });
            localPlayerEntity.addComponent(new InventoryComponent());
            localPlayerEntity.addComponent(new SkillsComponent());
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

    // NEW: Event listener for the color picker
    if (colorPicker && socket) {
        colorPicker.addEventListener('input', (event) => {
            const newColor = event.target.value;
            const localPlayerId = getLocalPlayerId();
            console.log(`[App.js Color Picker] Local Player ID: ${localPlayerId}, New Color: ${newColor}`);

            if (localPlayerId && playerEntities.has(localPlayerId)) {
                const localPlayerEntity = playerEntities.get(localPlayerId);
                const playerComponent = localPlayerEntity.getComponent('PlayerComponent'); // Get PlayerComponent
                // const meshComponent = localPlayerEntity.getComponent('MeshComponent'); // No longer needed here for local player color
                
                if (playerComponent) {
                    console.log(`[App.js Color Picker] Setting desiredColor to ${newColor} for local player.`);
                    playerComponent.desiredColor = newColor;
                    playerComponent.colorNeedsUpdate = true;
                } else {
                    console.error(`[App.js Color Picker] PlayerComponent not found for local player ${localPlayerId}`);
                }

                // Emit event to server
                socket.emit('player:updateColor', { playerId: localPlayerId, color: newColor });
            }
        });
    }
    
    // Initialize chat system
    initChat(socket);
    
    // Initialize admin panel
    initAdminPanel();
    
    // Get the current user and dispatch authenticated event
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username) {
        console.log('Dispatching player-authenticated event for user:', currentUser.username);
        document.dispatchEvent(new CustomEvent('player-authenticated', { 
            detail: { username: currentUser.username } 
        }));
        
        // Enable chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.disabled = false;
        }
    }

    // Create a cube entity using ECS
    const cube = createCubeEntity(world, { position: { x: 0, y: 1, z: 0 } });
    
    // Create a ground plane for players to move on
    const ground = createGroundEntity(world, { width: 20, height: 20 });
    
    // World items will be created from server data
    
    // Register systems
    world.registerSystem(new RenderSystem(scene));
    world.registerSystem(new RotationSystem(socket));
    world.registerSystem(new MovementSystem(socket));
    world.registerSystem(new ChatBubbleSystem(scene));
    world.registerSystem(new InventorySystem(socket));
    world.registerSystem(new CameraSystem());
    world.registerSystem(new ContextMenuSystem(socket));
    world.registerSystem(new SkillsSystem(socket));
    world.registerSystem(new CharacterSystem()); // Register CharacterSystem
    
    // Set up initial camera position for isometric view
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
                const transform = playerEntity.getComponent('TransformComponent');
                if (transform && player.position) {
                    transform.position.set(player.position.x, player.position.y, player.position.z);
                }
                // Update color if provided
                // const meshComponent = playerEntity.getComponent('MeshComponent'); // Already declared below for local player
                // if (meshComponent && meshComponent.mesh && meshComponent.mesh.material && player.color) {
                //     meshComponent.mesh.material.color.set(player.color);
                // }
                if (isLocal && !playerEntity.getComponent(InventoryComponent)) {
                    console.warn(`[App.js 'players-list'] Local player ${player.id} was missing InventoryComponent. Adding it now.`);
                    playerEntity.addComponent(new InventoryComponent());
                }
            } else {
                console.log(`[App.js 'players-list'] Creating new player entity for ${player.id} (isLocal: ${isLocal}).`);
                playerEntity = createPlayerEntity(world, scene, {
                    playerId: player.id,
                    username: player.username,
                    isLocalPlayer: isLocal,
                    color: player.color || '#3498db', // Use server color or default
                    position: player.position
                });
                playerEntity.addComponent(new InventoryComponent());
                playerEntities.set(player.id, playerEntity);
                const checkComp = playerEntity.getComponent(InventoryComponent);
                console.log(`[App.js 'players-list'] Added InventoryComponent to new player ${player.id}. Immediately retrieved: ${checkComp ? 'Found' : 'NOT Found'}`);
            }

            // If this is the local player and color is provided, update the color picker and mesh
            if (isLocal) {
                console.log(`[App.js Local Player Init - players-list] ID: ${player.id}, Received Color: ${player.color}`);
                const localPlayerEntityForUpdate = playerEntities.get(player.id);
                if (localPlayerEntityForUpdate) {
                    const playerComp = localPlayerEntityForUpdate.getComponent('PlayerComponent');
                    // const meshComp = localPlayerEntityForUpdate.getComponent('MeshComponent'); // No longer needed here
                    
                    if (playerComp && player.color) {
                        console.log(`[App.js Local Player Init - players-list] Setting desiredColor to ${player.color}.`);
                        playerComp.desiredColor = player.color;
                        playerComp.colorNeedsUpdate = true;
                    } else {
                        console.error(`[App.js Local Player Init - players-list] PlayerComponent or player.color missing for local player ${player.id}. Player color: ${player.color}`);
                    }
                } else {
                    console.error(`[App.js Local Player Init - players-list] Local player entity ${player.id} not found in map.`);
                }

                if (colorPicker && player.color) {
                    console.log(`[App.js Local Player Init - players-list] Setting color picker to ${player.color}`);
                    colorPicker.value = player.color;
                }
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
            const transform = playerEntity.getComponent('TransformComponent'); 
            if (transform && player.position) {
                transform.position.set(player.position.x, player.position.y, player.position.z);
            }
            // Update color if provided
            // const meshComponent = playerEntity.getComponent('MeshComponent'); // Already declared below for local player
            // if (meshComponent && meshComponent.mesh && meshComponent.mesh.material && player.color) {
            //    meshComponent.mesh.material.color.set(player.color);
            // }
            // Ensure InventoryComponent for local player
            if (isLocal && !playerEntity.getComponent(InventoryComponent)) {
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
            playerEntity = createPlayerEntity(world, {
                playerId: player.id,
                username: player.username,
                isLocalPlayer: isLocal,
                color: player.color || '#3498db', // Use server color or default
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
            const checkComp = playerEntity.getComponent(InventoryComponent);
            console.log(`[App.js 'player-joined'] Added InventoryComponent to new player ${player.id}. Immediately retrieved: ${checkComp ? 'Found' : 'NOT Found'}`);
        }

        // If this is the local player and color is provided, update the color picker and mesh
        if (isLocal) {
            console.log(`[App.js Local Player Init - player-joined] ID: ${player.id}, Received Color: ${player.color}`);
            const localPlayerEntityForUpdate = playerEntities.get(player.id);
            if (localPlayerEntityForUpdate) {
                const playerComp = localPlayerEntityForUpdate.getComponent('PlayerComponent');
                // const meshComp = localPlayerEntityForUpdate.getComponent('MeshComponent'); // No longer needed here

                if (playerComp && player.color) {
                    console.log(`[App.js Local Player Init - player-joined] Setting desiredColor to ${player.color}.`);
                    playerComp.desiredColor = player.color;
                    playerComp.colorNeedsUpdate = true;
                } else {
                    console.error(`[App.js Local Player Init - player-joined] PlayerComponent or player.color missing for local player ${player.id}. Player color: ${player.color}`);
                }
            } else {
                console.error(`[App.js Local Player Init - player-joined] Local player entity ${player.id} not found in map.`);
            }

            if (colorPicker && player.color) {
                console.log(`[App.js Local Player Init - player-joined] Setting color picker to ${player.color}`);
                colorPicker.value = player.color;
            }
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
            // Pass all available item properties to createBasicItem
            const itemEntity = createBasicItemEntity(world, {
                uuid: itemData.uuid,
                id: itemData.id,
                name: itemData.name,
                description: itemData.description,
                position: itemData.position,
                // Include gltfPath and other properties from the server data
                gltfPath: itemData.gltfPath,
                inventoryIconPath: itemData.inventoryIconPath,
                tradeable: itemData.tradeable,
                stackable: itemData.stackable,
                maxStack: itemData.maxStack,
                type: itemData.type
            });
            worldItemEntities.set(itemData.uuid, itemEntity);
        });
        console.log('World items created/updated:', worldItemEntities.size);
    });

    // Handle a single item being removed from the world
    document.addEventListener('world-item-removed', (event) => {
        const { uuid } = event.detail;
        console.log('Received world item removed (document event):', uuid);
        removeWorldItemFromScene(uuid);
    });
    
    // Socket event for world item removed
    if (socket) {
        socket.on('item-removed', (uuid) => {
            console.log('Received world item removed (socket event):', uuid);
            removeWorldItemFromScene(uuid);
        });
    }
    
    // Helper function to remove a world item from the scene
    function removeWorldItemFromScene(uuid) {
        const itemEntity = worldItemEntities.get(uuid);
        if (itemEntity) {
            itemEntity.deactivate(); 
            worldItemEntities.delete(uuid);
            console.log('World item entity removed:', uuid);
        } else {
            console.warn('Attempted to remove non-existent world item entity:', uuid);
        }
    }

    // Handle a single item being added to the world
    document.addEventListener('world-item-added', (event) => {
        const itemData = event.detail;
        console.log('Received world item added (document event):', itemData);
        addWorldItemToScene(itemData);
    });
    
    // Socket event for world item added
    if (socket) {
        socket.on('world-item-added', (itemData) => {
            console.log('Received world item added (socket event):', itemData);
            addWorldItemToScene(itemData);
        });
    }
    
    // Helper function to add a world item to the scene
    function addWorldItemToScene(itemData) {
        if (!itemData.uuid) {
            console.error("Added world item data missing uuid:", itemData);
            return;
        }
        if (worldItemEntities.has(itemData.uuid)) {
            console.warn('Attempted to add already existing world item entity:', itemData.uuid);
            return;
        }
        const itemEntity = createBasicItemEntity(world, {
            uuid: itemData.uuid,
            id: itemData.id,
            name: itemData.name,
            description: itemData.description,
            position: itemData.position,
            gltfPath: itemData.gltfPath
        });
        worldItemEntities.set(itemData.uuid, itemEntity);
        console.log('World item entity added:', itemData.uuid);
    }
    
    // Handle trade requests
    document.addEventListener('trade-request-received', (event) => {
        const data = event.detail;
        const localId = getLocalPlayerId();
        
        console.log('[App.js] Received trade request:', data);
        
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
        console.log('[App.js] Forwarding trade request to handleTradeRequest');
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
    
    // NEW: Handle player color changed event from server (for other players)
    if (socket) {
        socket.on('player:colorChanged', (data) => {
            console.log('[App.js] Received player:colorChanged:', data);
            const { id, color } = data; // This 'id' is the socket ID of the player whose color changed
            const localId = getLocalPlayerId();

            // Update color for remote players
            if (id !== localId && playerEntities.has(id)) {
                const playerEntity = playerEntities.get(id);
                const meshComponent = playerEntity.getComponent('MeshComponent');
                const playerComponent = playerEntity.getComponent('PlayerComponent'); // Get PlayerComponent for remote player

                if (meshComponent && meshComponent.mesh) {
                    console.log(`[App.js player:colorChanged] Applying color ${color} to remote player ${id}'s mesh.`);
                    // Check if mesh is a Group (which is the case for player entities)
                    if (meshComponent.mesh.type === 'Group' && meshComponent.mesh.children.length > 0) {
                        // The actual mesh with material is the first child of the group
                        const actualMesh = meshComponent.mesh.children[0];
                        if (actualMesh && actualMesh.material) {
                            actualMesh.material.color.set(color);
                            console.log(`[App.js player:colorChanged] Successfully updated remote player ${id}'s mesh color to ${color}`);
                        } else {
                            console.error(`[App.js player:colorChanged] Player mesh child or its material not found for remote player ${id}`);
                        }
                    } 
                    // Also handle the case where mesh might be a direct Mesh (not in a Group)
                    else if (meshComponent.mesh.material) {
                        meshComponent.mesh.material.color.set(color);
                        console.log(`[App.js player:colorChanged] Successfully updated remote player ${id}'s mesh color directly to ${color}`);
                    } else {
                        console.error(`[App.js player:colorChanged] Mesh material not found for remote player ${id}`);
                    }
                }
                // Optionally, update the PlayerComponent's 'color' or 'desiredColor' field for remote players too, for consistency
                if (playerComponent) {
                    playerComponent.color = color; // Or desiredColor, depending on how you want to manage it for remote players
                    playerComponent.desiredColor = color;
                    // No need to set colorNeedsUpdate for remote players if RenderSystem only acts on local player's flag,
                    // or if direct update is preferred for remotes.
                }
            } else {
                // If id === localId, this event is an echo of our own change. 
                // The local player's color should already be handled by the color picker input event and RenderSystem.
                // Or, if playerEntities.has(id) is false, the player is not known.
                console.warn(`[App.js player:colorChanged] Skipped color update for ${id}. Is local: ${id === localId}, Exists: ${playerEntities.has(id)}`);
            }
        });
    }

    // Main animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update all systems
        world.update(performance.now() / 1000);
        
        // Ensure player entities have proper userData for raycasting
        updatePlayerEntityMeshes(world);
    }
    
    // Initialize debug module
    initDebugModule(world, playerEntities, worldItemEntities);
    
    // Start the animation loop
    animate();
});
