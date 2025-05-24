// Player Entity Helper
// Utility functions for working with player entities

/**
 * Update player entity meshes with entity ID
 * This ensures player entities can be detected by raycasting for context menus
 * @param {World} world - The ECS world
 */
export function updatePlayerEntityMeshes(world) {
    if (!world) return;
    
    // Find all player entities
    const playerEntities = world.entities.filter(entity => 
        entity.active && entity.hasComponent('PlayerComponent')
    );
    
    // Update each player entity's mesh with its entity ID
    playerEntities.forEach(entity => {
        if (entity.hasComponent('MeshComponent')) {
            const meshComponent = entity.getComponent('MeshComponent');
            if (meshComponent.mesh) {
                // Set entity ID in mesh userData
                meshComponent.mesh.userData.entityId = entity.id;
                
                // Also set in all children
                meshComponent.mesh.traverse(child => {
                    child.userData.entityId = entity.id;
                });
            }
        }
    });
}
