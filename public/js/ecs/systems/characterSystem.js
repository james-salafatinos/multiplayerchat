// public/js/ecs/systems/characterSystem.js

export class CharacterSystem {
  constructor() { // entityManager (world) will be passed during system update
    this.name = 'character'; // System name, can be used for ordering or debugging
  }

  update(world, deltaTime) {
    const entities = world.findEntitiesWith('CharacterControllerComponent', 'MovementComponent', 'TransformComponent');
    if (!entities || entities.length === 0) {
      return;
    }

    for (const entity of entities) {
      const characterControllerComponent = entity.getComponent('CharacterControllerComponent');
      const movementComponent = entity.getComponent('MovementComponent');
      const transformComponent = entity.getComponent('TransformComponent');

      if (characterControllerComponent && characterControllerComponent.controller && movementComponent && transformComponent) {
        const playerComponent = entity.getComponent('PlayerComponent');
        const isRemotePlayer = playerComponent && !playerComponent.isLocalPlayer;

        if (isRemotePlayer) {
          // console.log(`[NET-ANIM-DBG] CharacterSystem: Updating remote entity ${entity.id}, movementComponent.isMoving: ${movementComponent.isMoving}`);
        } else if (playerComponent && playerComponent.isLocalPlayer) {
          // Optionally log local player too, if needed for comparison
          // console.log(`[NET-ANIM-DBG] CharacterSystem: Updating local player ${entity.id}, movementComponent.isMoving: ${movementComponent.isMoving}`);
        }

        if (playerComponent && !playerComponent.isLocalPlayer) {
          // console.log(`REMOTE_ANIM_DEBUG: [CharacterSystem] Remote Entity ID: ${entity.id}, isMoving: ${movementComponent.isMoving}`);
        }
        if (isRemotePlayer) {
            // console.log(`[NET-ANIM-DBG] CharacterSystem: Calling controller.Update for remote ${entity.id} with isMoving: ${movementComponent.isMoving}`);
        }
        characterControllerComponent.controller.Update(entity.id, deltaTime, movementComponent, transformComponent);
      } else {
        console.warn(`[CharacterSystem] Entity ID: ${entity.id} missing one or more required components/controller for update.`);
        if (!characterControllerComponent) console.warn('[CharacterSystem]   Missing CharacterControllerComponent');
        if (characterControllerComponent && !characterControllerComponent.controller) console.warn('[CharacterSystem]   Missing controller on CharacterControllerComponent');
        if (!movementComponent) console.warn('[CharacterSystem]   Missing MovementComponent');
        if (!transformComponent) console.warn('[CharacterSystem]   Missing TransformComponent');
      }
    }
  }
}
