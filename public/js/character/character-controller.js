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
    // Removed _decceleration, _acceleration, _velocity, _position as movement is now ECS driven

    this._animations = {};
    this._input = new BasicCharacterControllerInput(); // Input now primarily carries state like isMoving
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations)
    );

    this._target = null; // Will hold the character model
    this._mixer = null; // Animation mixer
    // Collider might still be useful for physics interactions, keep for now
    this._playerCollider = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 0.5); 

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

  Update(deltaTime, movementComponent, transformComponent) {
    if (!this._target || !this._mixer || !movementComponent || !transformComponent) {
      return;
    }

    // ADDED LOGS
    console.log("-----------------------------------------");
    console.log(`[CharacterController UPDATE] Timestamp: ${performance.now().toFixed(2)}`);
    console.log(`  Target Visible: ${this._target.visible}`);
    console.log(`  Target Position: X=${this._target.position.x.toFixed(2)}, Y=${this._target.position.y.toFixed(2)}, Z=${this._target.position.z.toFixed(2)}`);
    console.log(`  Target Quaternion: X=${this._target.quaternion.x.toFixed(2)}, Y=${this._target.quaternion.y.toFixed(2)}, Z=${this._target.quaternion.z.toFixed(2)}, W=${this._target.quaternion.w.toFixed(2)}`);
    console.log(`  MovementComponent.isMoving: ${movementComponent.isMoving}`);
    console.log(`  TransformComponent Position: X=${transformComponent.position.x.toFixed(2)}, Y=${transformComponent.position.y.toFixed(2)}, Z=${transformComponent.position.z.toFixed(2)}`);
    console.log(`  TransformComponent Euler Rotation: X=${transformComponent.rotation.x.toFixed(2)}, Y=${transformComponent.rotation.y.toFixed(2)}, Z=${transformComponent.rotation.z.toFixed(2)}`);
    if (this._stateMachine.currentState) {
        console.log(`  FSM State: ${this._stateMachine.currentState.Name}`);
    } else {
        console.log("  FSM State: undefined/none");
    }
    // END OF ADDED LOGS

    this._input.isMoving = movementComponent.isMoving;
    // this._input.isRunning = movementComponent.isRunning; 

    this._stateMachine.Update(deltaTime, this._input);

    this._target.position.copy(transformComponent.position);
    this._target.quaternion.setFromEuler(transformComponent.rotation);

    if (this._playerCollider) {
        this._playerCollider.center.copy(this._target.position);
        // Adjust Y if needed, e.g., this._playerCollider.center.y += this._playerCollider.radius;
    }

    this._mixer.update(deltaTime);
  }
  
  SetPosition(x, y, z) {
    if (this._target) {
      this._target.position.set(x, y, z);
      this._position.set(x, y, z);
      this._playerCollider.center.copy(this._target.position).add(new THREE.Vector3(0, this._playerCollider.radius, 0));
    }
  }
}
