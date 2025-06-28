// ResourceSystem.js
// System for managing resource entities (rocks, trees) in the game world

import { System } from '../core/system.js';
import { TransformComponent, ResourceComponent, InteractableComponent } from '../components/index.js';
import { getContextMenuManager } from '../../contextMenu.js';
import { getScene, getCamera } from '../../three-setup.js';
import * as THREE from 'three';
import { showNotification } from '../../utils/notifications.js';
import gameLogger from '../../utils/gameLogger.js';

/**
 * System for handling resources like rocks and trees
 */
export class ResourceSystem extends System {
    /**
     * Create a new ResourceSystem
     * @param {World} world - The ECS world this system belongs to
     * @param {Object} socket - Socket.io client instance
     */
    constructor(world, socket) {
        super(world);

        this.world = world; // Store world reference for context menu handling
        this.socket = socket;
        this.activeHarvests = new Map(); // Map of entityId -> harvest info (progress, timer)
        this.resourceMapping = new Map(); // Map of entityId -> serverResourceUuid
        this.progessBarElement = null;

        // Create raycaster for entity detection
        this.raycaster = new THREE.Raycaster();

        // Create progress bar element for harvesting
        this.createProgressBar();

        // Listen for resource updates from server
        this.socket.on('resource state', this.handleResourceUpdate.bind(this));

        // Listen for harvest complete event from server
        this.socket.on('harvest complete', this.handleHarvestComplete.bind(this));

        // Listen for harvest error event from server
        this.socket.on('harvest error', this.handleHarvestError.bind(this));
        
        // Listen for harvest started event from server
        this.socket.on('harvest started', (data) => {
            console.log( 'harvestStarted', `Harvest started for resource ${data.resourceId} with duration ${data.duration}ms`);
        });

        // Listen for context menu requests to handle resource interactions
        document.addEventListener('context-menu-requested', this.handleContextMenu.bind(this));
    }

    /**
     * Create the progress bar element for harvesting
     */
    createProgressBar() {
        this.progressBarElement = document.createElement('div');
        this.progressBarElement.className = 'harvest-progress';
        this.progressBarElement.innerHTML = `
            <div class="harvest-progress-inner"></div>
            <div class="harvest-progress-text">Mining...</div>
        `;
        this.progressBarElement.style.display = 'none';
        document.body.appendChild(this.progressBarElement);
    }

    /**
     * Show the progress bar at a specific position with specific text
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Progress bar text
     * @param {number} progress - Progress percentage (0-100)
     */
    showProgressBar(x, y, text, progress) {
        this.progressBarElement.style.display = 'block';
        this.progressBarElement.style.left = `${x}px`;
        this.progressBarElement.style.top = `${y - 50}px`; // Position above entity

        const innerBar = this.progressBarElement.querySelector('.harvest-progress-inner');
        innerBar.style.width = `${progress}%`;

        const textElement = this.progressBarElement.querySelector('.harvest-progress-text');
        textElement.textContent = text;
    }

    /**
     * Hide the progress bar
     */
    hideProgressBar() {
        this.progressBarElement.style.display = 'none';
    }

    /**
     * Handle context menu request for resources
     * @param {CustomEvent} event - Context menu request event
     */
    handleContextMenu(event) {
        console.log('ResourceSystem handling context menu request', event.detail);
        
        // Get click position
        const { clientX, clientY } = event.detail;

        // Get scene and camera
        const scene = getScene();
        const camera = getCamera();
        if (!scene || !camera) {
            console.error('Scene or camera not available');
            return;
        }
        console.log('Scene and camera found');

        // Calculate normalized device coordinates
        const rect = document.body.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;

        // Set up the raycaster
        this.raycaster.setFromCamera({ x, y }, camera);

        // Cast ray and check for intersections
        const intersects = this.raycaster.intersectObjects(scene.children, true);
        console.log(`Found ${intersects.length} intersected objects:`, intersects);
        if (intersects.length === 0) {
            console.log('No objects intersected by ray');
            return;
        }

        // Find first intersected entity
        let entityId = null;

        for (const intersect of intersects) {
            // Check if the intersected object has userData with entityId
            let obj = intersect.object;
            console.log('Checking intersected object:', obj.name || 'unnamed', obj);
            console.log('Object userData:', obj.userData);
            
            while (obj && !entityId) {
                if (obj.userData && obj.userData.entityId !== undefined) {
                    entityId = obj.userData.entityId;
                    console.log('Found entityId in object userData:', entityId);
                    break;
                }
                obj = obj.parent;
            }

            if (entityId) break;
        }

        // If no entity was found, return
        if (!entityId) {
            console.log('No entity ID found in any intersected object');
            return;
        }
        console.log('Found entity ID:', entityId);

        // Find the entity in the world
        const entity = this.world.getEntityById(entityId);
        if (!entity) {
            console.error(`Entity with ID ${entityId} not found in world`);
            return;
        }
        console.log('Found entity in world:', entity);

        // Check if entity has ResourceComponent and InteractableComponent
        console.log('Entity has ResourceComponent?', entity.hasComponent('ResourceComponent'));
        console.log('Entity has InteractableComponent?', entity.hasComponent('InteractableComponent'));
        if (entity.hasComponent('ResourceComponent') && entity.hasComponent('InteractableComponent')) {
            const resourceComp = entity.getComponent('ResourceComponent');
            const interactableComp = entity.getComponent('InteractableComponent');

            if (resourceComp && interactableComp) {
                // Prevent default context menu
                event.preventDefault();

                const menuItems = [];

                // Add appropriate action based on resource type
                if (resourceComp.type === 'rock') {
                    // Only show mine option if resource is available
                    if (resourceComp.state === 'available') {
                        menuItems.push({
                            label: 'Mine',
                            action: () => {
                                console.log('Mine action clicked for entity:', entity);
                                this.startHarvesting(entity.id, 'mine');
                            }
                        });
                    } else {
                        menuItems.push({
                            label: 'Depleted',
                            disabled: true
                        });
                    }
                } else if (resourceComp.type === 'tree') {
                    // Only show chop option if resource is available
                    if (resourceComp.state === 'available') {
                        menuItems.push({
                            label: 'Chop',
                            action: () => {
                                console.log('Chop action clicked for tree entity:', entity);
                                this.startHarvesting(entity.id, 'chop');
                            }
                        });
                    } else {
                        menuItems.push({
                            label: 'Depleted',
                            disabled: true
                        });
                    }
                }

                // Add examine option
                menuItems.push({
                    label: 'Examine',
                    action: () => {
                        // Display resource info
                        console.log(`Examining ${resourceComp.type}`);

                        // Could show a tooltip or info panel here
                        const message = resourceComp.type === 'rock' ?
                            'A rocky outcrop containing valuable ore.' :
                            'A healthy tree that could be chopped for logs.';

                        // Show message to player
                        // (This is a placeholder - you might want to implement a proper info display)
                        alert(message);
                        
                        // Log the examine action
                        gameLogger.logResourceAction(resourceComp.type, `examined ${resourceComp.type}`, {});
                    }
                });

                // Show context menu
                const contextMenuManager = getContextMenuManager();
                contextMenuManager.showMenu(clientX, clientY, menuItems, {
                    entityId: entity,
                    type: resourceComp.type
                });
            }
        }
    }

    /**
     * Start harvesting a resource
     * @param {number} entityId - Entity ID of the resource
     * @param {string} action - Harvest action ('mine' or 'chop')
     */
    startHarvesting(entityId, action) {
        console.log(`Starting ${action} on entity ${entityId}`, new Error().stack);
        
        // Check if already harvesting
        if (this.activeHarvests.has(entityId)) {
            console.log(`Already harvesting resource ${entityId}`);
            return;
        }

        const entity = this.world.getEntityById(entityId);
        if (!entity) {
            console.error(`Entity with ID ${entityId} not found in startHarvesting`);
            return;
        }
        console.log('Found entity in startHarvesting:', entity);
        
        // Get the resource type from the entity
        let resourceType = null;
        
        // Try to get from ResourceComponent first
        const resourceComp = entity.getComponent('ResourceComponent');
        if (resourceComp) {
            console.log('Found ResourceComponent in startHarvesting:', resourceComp);
            resourceType = resourceComp.type;
        } else {
            // If no ResourceComponent, try to determine from InteractableComponent
            const interactableComp = entity.getComponent('InteractableComponent');
            if (interactableComp) {
                console.log('Found InteractableComponent in startHarvesting:', interactableComp);
                resourceType = interactableComp.type;
            } else {
                console.error(`Entity ${entityId} does not have a ResourceComponent or InteractableComponent in startHarvesting`);
                showNotification('Cannot harvest: Unknown resource type', 'error');
                return;
            }
        }
        
        // Find the server resource UUID that corresponds to this entity
        // For now, we'll use a dummy UUID based on the entity ID
        // In a real implementation, you would maintain a mapping from entity IDs to server resource UUIDs
        // This is a temporary solution to get things working
        const serverResourceId = `resource_${entityId}`;
        
        // Send harvest request to server
        console.log(`Emitting resource interaction event to server: resourceId=${serverResourceId}, action=${action}`);
        this.socket.emit('resource interaction', {
            resourceId: serverResourceId,
            action: action
        });
        console.log('Resource interaction event emitted');
        
        // Log the resource action to game logger
        gameLogger.logResourceAction(resourceType, `started ${action}ing ${resourceType}`, {});
        
        // Start local harvest progress tracking
        const harvestInfo = {
            startTime: Date.now(),
            duration: resourceComp ? resourceComp.harvestTime : 3000, // Default to 3 seconds if no ResourceComponent
            action: action,
            timer: setInterval(() => this.updateHarvestProgress(entityId), 50)
        };

        this.activeHarvests.set(entityId, harvestInfo);

        // Log the resource gathering action to the game action log
        const actionText = action === 'mine' ? 'mining' : 'chopping';
        const resourceText = resourceType === 'rock' ? 'rock' : 'tree';
        
        // Only log if gameLogger is initialized
        if (gameLogger.socket && gameLogger.localPlayerId) {
            gameLogger.logResourceAction(resourceText, actionText);
        }

        // Update resource visual state if we have a ResourceComponent
        if (resourceComp) {
            resourceComp.visualState = 'depleting';
        }
    }

    /**
     * Update harvest progress for a resource
     * @param {number} entityId - Entity ID of the resource
     */
    updateHarvestProgress(entityId) {
        const harvestInfo = this.activeHarvests.get(entityId);
        if (!harvestInfo) return;

        const entity = this.world.getEntityById(entityId);
        if (!entity) return;

        const resourceComp = entity.getComponent('ResourceComponent');
        const transformComp = entity.getComponent('TransformComponent');
        if (!resourceComp || !transformComp) return;

        // Calculate progress
        const elapsed = Date.now() - harvestInfo.startTime;
        const progress = Math.min(100, (elapsed / harvestInfo.duration) * 100);

        // Update component progress
        resourceComp.progressPercent = progress;

        // Get screen position of resource for progress bar
        // Use the camera to project the 3D position to screen coordinates
        if (window.camera && window.renderer) {
            const position = new THREE.Vector3().copy(transformComp.position);
            const screenPos = position.project(window.camera);
            
            // Convert to actual screen coordinates
            const x = (screenPos.x * 0.5 + 0.5) * window.renderer.domElement.width;
            const y = (-(screenPos.y * 0.5) + 0.5) * window.renderer.domElement.height;
            
            // Show progress bar
            const actionText = harvestInfo.action === 'mine' ? 'Mining...' : 'Chopping...';
            this.showProgressBar(x, y, actionText, progress);
        }

        // If complete locally (server will confirm)
        if (progress >= 100) {
            // Clear the interval but don't remove from active harvests yet
            // Wait for server confirmation
            clearInterval(harvestInfo.timer);
        }
    }

    /**
     * Handle resource update from server
     * @param {Object} data - Resource update data
     */
    handleResourceUpdate(data) {
        const { resourceId, state } = data;

        console.log('handleResourceUpdate', `Resource ${resourceId} state updated to ${state}`);

        // Convert server resourceId (resource_123) back to entity ID (123) if needed
        let entityId = resourceId;
        if (resourceId.startsWith('resource_')) {
            entityId = parseInt(resourceId.split('_')[1]);
            console.log(`Converting server resource ID ${resourceId} to entity ID ${entityId}`);
        }

        // Find the resource entity
        const entity = this.world.getEntityById(entityId);
        if (!entity) {
            console.log('handleResourceUpdate', `Entity with ID ${entityId} not found`);
            return;
        }

        const resourceComp = entity.getComponent('ResourceComponent');
        if (resourceComp) {
            // Update resource state
            resourceComp.state = state;

            // Update visual state
            if (state === 'available') {
                resourceComp.visualState = 'normal';
                resourceComp.progressPercent = 0;
            } else if (state === 'depleted') {
                resourceComp.visualState = 'depleted';
            }
            
            console.log( 'handleResourceUpdate', `Updated resource ${resourceId} visual state to ${resourceComp.visualState}`);
            
            // Log resource depletion if applicable
            if (resourceComp.visualState === 'depleted') {
                gameLogger.logResourceAction(resourceComp.type, `depleted ${resourceComp.type}`, {});
            }
        }
    }

    /**
     * Handle harvest complete event from server
     * @param {Object} data - Harvest complete data
     */
    handleHarvestComplete(data) {
        const { resourceId, items, experience } = data;
        console.log('handleHarvestComplete', data);

        // Clean up active harvest
        // Convert server resourceId (resource_123) back to entity ID (123) if needed
        let entityId = resourceId;
        if (resourceId.startsWith('resource_')) {
            entityId = parseInt(resourceId.split('_')[1]);
            console.log(`Converting server resource ID ${resourceId} to entity ID ${entityId}`);
        }
        
        this.cleanupActiveHarvest(entityId);

        // Show success message with notification
        if (items && items.length > 0) {
            const itemMessages = items.map(item => `${item.quantity}x ${item.itemId}`).join(', ');
            console.log('handleHarvestComplete', `Harvested ${itemMessages}`);
            
            // Display notification to the player
            showNotification(`Harvested ${itemMessages}`, 'success');
            
            // Log the item receipt to game action log
            if (gameLogger.socket && gameLogger.localPlayerId) {
                items.forEach(item => {
                    gameLogger.logItemReceived(item.itemId, item.quantity, { source: 'harvesting' });
                });
            }
            
            if (experience) {
                showNotification(`Gained ${experience} XP`, 'info');
                // Log XP gain to game action log
                gameLogger.log('Experience', `Gained ${experience} XP`);
            }
        } else {
            console.log('handleHarvestComplete', 'No items received from harvest');
        }
    }

    /**
     * Handle harvest error event from server
     * @param {Object} data - Harvest error data
     */
    handleHarvestError(data) {
        const { resourceId, error } = data;
        console.log('handleHarvestError', data);

        // Clean up active harvest
        // Convert server resourceId (resource_123) back to entity ID (123) if needed
        let entityId = resourceId;
        if (resourceId.startsWith('resource_')) {
            entityId = parseInt(resourceId.split('_')[1]);
            console.log(`Converting server resource ID ${resourceId} to entity ID ${entityId}`);
        }

        this.cleanupActiveHarvest(entityId);

        // Show error message
        console.log('handleHarvestError', `Harvest error: ${error}`);

        // Display error notification to the player
        showNotification(error, 'error');
        
        // Log the error to game action log
        gameLogger.log('Harvesting', `Failed: ${error}`, 'error');
    }

    /**
     * Clean up active harvest for a resource
     * @param {number} entityId - Entity ID of the resource
     */
    cleanupActiveHarvest(entityId) {
        const harvestInfo = this.activeHarvests.get(entityId);
        if (harvestInfo) {
            // Clear interval
            clearInterval(harvestInfo.timer);

            // Remove from active harvests
            this.activeHarvests.delete(entityId);
        }

        // Hide progress bar
        this.hideProgressBar();
    }

    /**
     * Update system on each frame
     * @param {World} world - The ECS world
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(world, deltaTime) {
        // Query for all resource entities
        const resourceEntities = world.queryEntities([ResourceComponent, TransformComponent]);

        for (const entityId of resourceEntities) {
            const entity = world.getEntityById(entityId);
            if (!entity) continue;

            const resourceComp = entity.getComponent('ResourceComponent');
            if (!resourceComp) continue;

            // Update visual state based on server state
            if (resourceComp.state === 'depleted' && resourceComp.visualState !== 'depleted') {
                resourceComp.visualState = 'depleted';
            } else if (resourceComp.state === 'available' && resourceComp.visualState === 'depleted') {
                resourceComp.visualState = 'normal';
            }

            // Update any active harvests
            // (most of this is handled by the timer/interval set up earlier)
        }
    }
}
