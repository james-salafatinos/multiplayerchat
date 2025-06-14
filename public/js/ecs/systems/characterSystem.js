// public/js/ecs/systems/characterSystem.js

export class CharacterSystem {
  constructor() { // entityManager (world) will be passed during system update
    this.name = 'character'; // System name, can be used for ordering or debugging
  }

  update(world, deltaTime) {
    const entities = world.findEntitiesWith('CharacterControllerComponent', 'MovementComponent', 'TransformComponent');
    if (!entities || entities.length === 0) {
      // console.log('[CharacterSystem] No entities found with required components.');
      return;
    }
    // console.log(`[CharacterSystem] Found ${entities.length} entities with required components.`);

    for (const entity of entities) {
      // console.log(`[CharacterSystem] Processing entity ID: ${entity.id}`);
      const characterControllerComponent = entity.getComponent('CharacterControllerComponent');
      const movementComponent = entity.getComponent('MovementComponent');
      const transformComponent = entity.getComponent('TransformComponent');

      if (characterControllerComponent && characterControllerComponent.controller && movementComponent && transformComponent) {
        // console.log(`[CharacterSystem] Updating controller for entity ID: ${entity.id}`);
        // console.log(`[CharacterSystem]   isMoving: ${movementComponent.isMoving}, targetPos:`, movementComponent.targetPosition);
        // console.log(`[CharacterSystem]   currentPos:`, transformComponent.position, `currentRot:`, transformComponent.rotation);
        characterControllerComponent.controller.Update(deltaTime, movementComponent, transformComponent);
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
