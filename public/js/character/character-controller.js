// public/js/character/character-controller.js
import * as THREE from 'three';
import { FBXLoader } from '../modules/FBXLoader.js';
import { BasicCharacterControllerInput } from './character-input.js';
import { CharacterFSM } from './state-machine.js';

export class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

export class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0); // Default decceleration
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0); // Default acceleration, adjusted Z for potentially smaller scale
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations)
    );

    this._target = null; // Will hold the character model
    this._mixer = null; // Animation mixer
    this._playerCollider = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 0.5); // Default collider, adjust Y and radius as needed

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    const modelPath = this._params.assetPath || './models/character/'; // Default path
    const modelFile = this._params.modelFile || 'model.fbx'; // Default model file
    const modelScale = this._params.modelScale || 0.01; // Default scale

    loader.setPath(modelPath);
    loader.load(modelFile, (fbx) => {
      console.log('[CharacterController] Model loaded successfully:', fbx);
      fbx.scale.setScalar(modelScale);
      console.log(`[CharacterController] Model scale set to: ${modelScale}`);
      fbx.traverse((c) => {
        c.castShadow = true;
        c.receiveShadow = true; // Optional: if the character should also receive shadows
      });

      this._target = fbx;
      this._params.scene.add(this._target);
      console.log('[CharacterController] Model added to scene.');
      console.log(`[CharacterController] Model final position:`, this._target.position);
      console.log(`[CharacterController] Model final scale:`, this._target.scale);
      console.log(`[CharacterController] Model visibility: ${this._target.visible}`);
      // Log scene children to confirm
      // console.log('[CharacterController] Scene children:', this._params.scene.children);

      this._playerCollider.center.set(0, this._playerCollider.radius, 0); // Initialize collider position relative to model

      this._mixer = new THREE.AnimationMixer(this._target);

      const manager = new THREE.LoadingManager();
      manager.onLoad = () => {
        this._stateMachine.SetState('idle');
      };

      const _OnLoad = (animName, anim) => {
        if (anim.animations && anim.animations.length > 0) {
          const clip = anim.animations[0];
          console.log(`[CharacterController] Loaded animation '${animName}':`, clip);
          const action = this._mixer.clipAction(clip);
          this._animations[animName] = {
            clip: clip,
            action: action,
          };
        } else {
          console.warn(`Animation ${animName} loaded from ${modelPath} has no animation data.`);
        }
      };

      const animLoader = new FBXLoader(manager);
      animLoader.setPath(modelPath);

      const animationFiles = this._params.animationFiles || {
        idle: 'idle.fbx',
        walk: 'walk.fbx',
        run: 'run.fbx',
        dance: 'dance.fbx',
      }; // Default animation files

      for (const animName in animationFiles) {
        if (animationFiles.hasOwnProperty(animName)) {
          animLoader.load(animationFiles[animName], (anim) => {
            _OnLoad(animName, anim);
          });
        }
      }
    }, undefined, (error) => {
      console.error('Error loading character model:', error);
    });
  }

  get Position() {
    // Return a copy to prevent external modification if _target is not yet loaded
    return this._target ? this._target.position.clone() : this._position.clone();
  }

  get Rotation() {
    if (!this._target) {
      return new THREE.Quaternion();
    }
    return this._target.quaternion.clone();
  }

  Update(timeInSeconds) {
    if (!this._target || !this._mixer) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    const runSpeedMultiplier = this._params.runSpeedMultiplier || 2.0;
    const rotationSpeed = this._params.rotationSpeed || 4.0;

    if (this._input._keys.shift) {
      acc.multiplyScalar(runSpeedMultiplier);
    }

    // Movement
    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }

    // Rotation
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        rotationSpeed * Math.PI * timeInSeconds * this._acceleration.y // Using _acceleration.y as a base for rotation sensitivity
      );
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        rotationSpeed * -Math.PI * timeInSeconds * this._acceleration.y
      );
      _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0); // Not used for movement in this version, but can be added
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    // Apply forward/backward movement
    const moveDelta = forward.multiplyScalar(velocity.z * timeInSeconds);
    controlObject.position.add(moveDelta);

    this._position.copy(controlObject.position);
    this._playerCollider.center.copy(controlObject.position).add(new THREE.Vector3(0, this._playerCollider.radius, 0)); // Update collider position

    this._mixer.update(timeInSeconds);
  }
  
  // Method to allow external positioning (e.g., for initial spawn)
  SetPosition(x, y, z) {
    if (this._target) {
      this._target.position.set(x, y, z);
      this._position.set(x, y, z);
      this._playerCollider.center.copy(this._target.position).add(new THREE.Vector3(0, this._playerCollider.radius, 0));
    }
  }
}
