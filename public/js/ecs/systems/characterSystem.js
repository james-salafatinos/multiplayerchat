// public/js/ecs/systems/characterSystem.js

export class CharacterSystem {
  constructor() { // entityManager (world) will be passed during system update
    this.name = 'character'; // System name, can be used for ordering or debugging
  }

  update(world, deltaTime) { // Changed signature to match world.js
    const entities = world.findEntitiesWith('CharacterControllerComponent'); // Changed method name
    if (!entities) {
      return;
    }

    for (const entity of entities) {
      const characterControllerComponent = entity.getComponent('CharacterControllerComponent');
      if (characterControllerComponent && characterControllerComponent.controller) {
        characterControllerComponent.controller.Update(deltaTime);
      }
    }
  }
}
