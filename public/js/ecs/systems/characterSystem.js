// public/js/ecs/systems/characterSystem.js
;

export class CharacterSystem {
  constructor() { // entityManager (world) will be passed during system update
    this.name = 'character'; // System name, can be used for ordering or debugging
    console.log( 'CharacterSystem', 'Character system initialized');
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

        characterControllerComponent.controller.Update(entity.id, deltaTime, movementComponent, transformComponent);
      } else {
        console.log( 'CharacterSystem', `Entity ID: ${entity.id} missing component(s) for update`, {
          hasController: Boolean(characterControllerComponent && characterControllerComponent.controller),
          hasMovement: Boolean(movementComponent),
          hasTransform: Boolean(transformComponent)
        });
      }
    }
  }
}
