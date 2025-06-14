// public/js/ecs/components/characterControllerComponent.js
import { BasicCharacterController } from '../../character/character-controller.js';

export class CharacterControllerComponent {
  constructor(params) {
    // params should include scene, assetPath, modelFile, modelScale, animationFiles, etc.
    // as required by BasicCharacterController
    this.controller = new BasicCharacterController(params);
    this.name = 'characterController';
  }

  // Optional: Add methods to easily access controller properties or methods if needed
  // e.g., SetPosition, GetPosition, etc.
  setPosition(x, y, z) {
    this.controller.SetPosition(x, y, z);
  }

  get position() {
    return this.controller.Position;
  }

  get rotation() {
    return this.controller.Rotation;
  }
}
