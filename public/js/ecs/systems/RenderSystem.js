// ECS Systems
// Systems contain logic that operates on entities with specific components

import { System } from '../core/index.js';
import { render} from '../../three-setup.js';


/**
 * Render System
 * Handles rendering entities with mesh and transform components
 */
export class RenderSystem extends System {
    constructor(scene) {
        super();
        this.requiredComponents = ['MeshComponent', 'TransformComponent'];
        this.scene = scene;
    }

    /**
     * Initialize the system, adding all meshes to the scene
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        for (const entity of world.entities) {
            if (this.matchesEntity(entity)) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh && !meshComponent.addedToScene) {
                    this.scene.add(meshComponent.mesh);
                    meshComponent.addedToScene = true;
                }
            }
        }
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     */
    processEntity(entity) {
        const meshComponent = entity.getComponent('MeshComponent');
        const transformComponent = entity.getComponent('TransformComponent');
        
        // Skip if no mesh
        if (!meshComponent.mesh) return;
        
        // Add to scene if not already added
        if (!meshComponent.addedToScene) {
            this.scene.add(meshComponent.mesh);
            meshComponent.addedToScene = true;
        }
        
        // Update mesh transform
        meshComponent.mesh.position.copy(transformComponent.position);
        meshComponent.mesh.rotation.copy(transformComponent.rotation);
        meshComponent.mesh.scale.copy(transformComponent.scale);

        // --- BEGIN ADDED COLOR UPDATE LOGIC ---
        if (entity.hasComponent('PlayerComponent')) {
            const playerComponent = entity.getComponent('PlayerComponent');
            // New log: Check state for any entity with PlayerComponent
            // console.log(`[RenderSystem Check] Entity ID: ${entity.id}, isLocal: ${playerComponent.isLocalPlayer}, needsUpdate: ${playerComponent.colorNeedsUpdate}, desiredColor: ${playerComponent.desiredColor}, meshExists: ${!!(meshComponent.mesh)}`);

            if (playerComponent.isLocalPlayer && playerComponent.colorNeedsUpdate && meshComponent.mesh) {
                try {
                    // Check if mesh is a Group (which is the case for player entities)
                    if (meshComponent.mesh.type === 'Group' && meshComponent.mesh.children.length > 0) {
                        // The actual mesh with material is the first child of the group
                        const actualMesh = meshComponent.mesh.children[0];
                        if (actualMesh && actualMesh.material) {
                            actualMesh.material.color.set(playerComponent.desiredColor);
                            playerComponent.color = playerComponent.desiredColor; // Keep actual color field in sync
                            playerComponent.colorNeedsUpdate = false;
                            console.log(`[RenderSystem] Updated local player ${playerComponent.playerId || entity.id} mesh color to ${playerComponent.desiredColor}`);
                        } else {
                            console.error(`[RenderSystem] Player mesh child or its material not found for ${playerComponent.playerId || entity.id}`);
                        }
                    } 
                    // Also handle the case where mesh might be a direct Mesh (not in a Group)
                    else if (meshComponent.mesh.material) {
                        meshComponent.mesh.material.color.set(playerComponent.desiredColor);
                        playerComponent.color = playerComponent.desiredColor;
                        playerComponent.colorNeedsUpdate = false;
                        console.log(`[RenderSystem] Updated local player ${playerComponent.playerId || entity.id} mesh color directly to ${playerComponent.desiredColor}`);
                    } else {
                        console.error(`[RenderSystem] Mesh material not found for player ${playerComponent.playerId || entity.id}`);
                    }
                } catch (e) {
                    console.error(`[RenderSystem] Error setting color for local player ${playerComponent.playerId || entity.id}: ${e}. Desired color: ${playerComponent.desiredColor}`);
                }
            }
        }
        // --- END ADDED COLOR UPDATE LOGIC ---
    }

    /**
     * Update this system
     * @param {World} world - The world this system belongs to
     */
    update(world) {
        // Check for deactivated entities with meshes and remove them from the scene
        for (const entity of world.entities) {
            if (!entity.active && entity.hasComponent('MeshComponent')) {
                const meshComponent = entity.getComponent('MeshComponent');
                if (meshComponent.mesh && meshComponent.addedToScene) {
                    // Remove from scene
                    this.scene.remove(meshComponent.mesh);
                    meshComponent.addedToScene = false;
                    console.log('RenderSystem: Removed deactivated entity mesh from scene');
                }
            }
        }
        
        // Process all matching entities
        super.update(world);
        
        // Render the scene
        render();
    }
}
