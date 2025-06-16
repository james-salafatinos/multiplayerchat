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
    this._animationsLoaded = false; // Track if animations are ready

    // Set _pendingInitialState based on the passed initialIsMoving parameter from createPlayerEntity
    this._pendingInitialState = params.initialIsMoving ? 'walk' : 'idle';
    const playerTypeForLog = params.isLocalPlayer === false ? 'REMOTE' : 'LOCAL';
    console.log(`[NET-ANIM-DBG] ${playerTypeForLog} BasicCharacterController _Init: entity ${params.entityId}, initialIsMoving: ${params.initialIsMoving}, _pendingInitialState set to: ${this._pendingInitialState}`);

    this._target = null; // Will hold the character model
    this._mixer = null; // Animation mixer
    // Collider might still be useful for physics interactions, keep for now
    this._playerCollider = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 0.5); 

    this._LoadModels();
  }

  _LoadModels() {
    // Get entity ID for logging if available
    const entityId = this._params.entityId || 'unknown';
    const isRemote = this._params.isLocalPlayer === false;
    const playerType = isRemote ? 'REMOTE' : 'LOCAL';
    
    // console.log(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: Starting model load for entity ${entityId}`);
    // console.log(`[NET-ANIM-DBG] ${playerType} Model path: ${this._params.assetPath}, Model file: ${this._params.modelFile}`);
    
    const loader = new FBXLoader();
    const modelPath = this._params.assetPath || './models/character/'; // Default path
    const modelFile = this._params.modelFile || 'model.fbx'; // Default model file
    const modelScale = this._params.modelScale || 0.01; // Default scale

    loader.setPath(modelPath);
    loader.load(modelFile, (fbx) => {
      // console.log(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: Model loaded successfully for entity ${entityId}`);
      
      fbx.scale.setScalar(modelScale);
      fbx.traverse((c) => {
        c.castShadow = true;
        c.receiveShadow = true; // Optional: if the character should also receive shadows
      });

      this._target = fbx;
      if (!this._params.scene) {
        console.error(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: No scene provided for entity ${entityId}!`);
        return;
      }
      
      this._params.scene.add(this._target);
      // console.log(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: Added model to scene for entity ${entityId}`);
      
      this._playerCollider.center.set(0, this._playerCollider.radius, 0); // Initialize collider position relative to model

      this._mixer = new THREE.AnimationMixer(this._target);
      // console.log(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: Created animation mixer for entity ${entityId}`);

      const manager = new THREE.LoadingManager();
      manager.onProgress = (url, itemsLoaded, itemsTotal) => {
        // console.log(`[NET-ANIM-DBG] ${playerType} Animation loading progress for entity ${entityId}: ${itemsLoaded}/${itemsTotal} - ${url}`);
      };
      
      manager.onLoad = () => {
        this._animationsLoaded = true;
        console.log(`[NET-ANIM-DBG] ${playerType} BasicCharacterController._LoadModels: ALL ANIMATIONS LOADED for entity ${entityId}. Setting FSM state to: ${this._pendingInitialState}`);
        console.log(`[NET-ANIM-DBG] ${playerType} Animation count: ${Object.keys(this._animations).length}, Available animations: ${Object.keys(this._animations).join(', ')}`);
        
        // Initialize state machine with pending state
        this._stateMachine.SetState(this._pendingInitialState);
        
        // Dispatch event to notify that animations are loaded
        const event = new CustomEvent('character-animations-loaded', { 
          detail: { entityId: entityId, isRemote: isRemote } 
        });
        document.dispatchEvent(event);
      };
      
      manager.onError = (url) => {
        console.error(`[NET-ANIM-DBG] ${playerType} Animation loading error for entity ${entityId}: ${url}`);
      };

      const _OnLoad = (animName, anim) => {
        if (anim.animations && anim.animations.length > 0) {
          const clip = anim.animations[0];
          const action = this._mixer.clipAction(clip);
          this._animations[animName] = {
            clip: clip,
            action: action,
          };
          // console.log(`[NET-ANIM-DBG] ${playerType} Animation '${animName}' loaded successfully for entity ${entityId}`);
        } else {
          console.warn(`[NET-ANIM-DBG] ${playerType} Animation ${animName} loaded from ${modelPath} has no animation data for entity ${entityId}`);
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
      
      console.log(`[NET-ANIM-DBG] ${playerType} Loading animations for entity ${entityId}: ${Object.keys(animationFiles).join(', ')}`);

      for (const animName in animationFiles) {
        if (animationFiles.hasOwnProperty(animName)) {
          // console.log(`[NET-ANIM-DBG] ${playerType} Starting load of animation '${animName}' from ${modelPath}${animationFiles[animName]} for entity ${entityId}`);
          animLoader.load(animationFiles[animName], (anim) => {
            _OnLoad(animName, anim);
          }, 
          (xhr) => {
            // onProgress callback
            if (xhr.lengthComputable) {
              const percentComplete = xhr.loaded / xhr.total * 100;
              // console.log(`[NET-ANIM-DBG] ${playerType} Animation '${animName}' loading: ${Math.round(percentComplete)}% for entity ${entityId}`);
            }
          },
          (error) => { // onError callback
            console.error(`[NET-ANIM-DBG] ${playerType} Error loading animation ${animName} from ${animationFiles[animName]} for entity ${entityId}:`, error);
          });
        }
      }
    }, 
    (xhr) => {
      // onProgress callback for model loading
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        // console.log(`[NET-ANIM-DBG] ${playerType} Model loading: ${Math.round(percentComplete)}% for entity ${entityId}`);
      }
    }, 
    (error) => {
      console.error(`[NET-ANIM-DBG] ${playerType} Error loading character model for entity ${entityId}:`, error);
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

  Update(entityId, deltaTime, movementComponent, transformComponent) {
    // NET-ANIM-DBG: Log entity ID if available (requires passing entity or ID to controller)
    // For now, we'll use a placeholder or rely on CharacterSystem logs for entity ID correlation.
    // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Start for entity (ID needed), initial movementComponent.isMoving: ${movementComponent?.isMoving}`);

    if (!this._target || !this._mixer || !movementComponent || !transformComponent) {
      return;
    }

   if (this._stateMachine && this._stateMachine._currentState) {
        // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, Current FSM State: ${this._stateMachine._currentState.Name}, animationsLoaded: ${this._animationsLoaded}`);
        // console.log(`  FSM State: ${this._stateMachine._currentState.Name}`);
    } else {
        // console.log("  FSM State: undefined/none");
    }
    // END OF ADDED LOGS

    this._input.isMoving = movementComponent.isMoving;
    // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, movementComponent.isMoving: ${movementComponent.isMoving}, assigned to this._input.isMoving: ${this._input.isMoving}`);
    // this._input.isRunning = movementComponent.isRunning; 

    // If animations are loaded, update state machine
    if (this._animationsLoaded) {
      // console.log(`[ControllerUpdate] animationsLoaded: ${this._animationsLoaded}, input.isMoving: ${this._input.isMoving}, target: ${this._target?.uuid}`);
      // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, Animations loaded. Calling _stateMachine.Update. isMoving: ${this._input.isMoving}`);
      this._stateMachine.Update(deltaTime, this._input);
    } else {
      // If animations aren't loaded yet, store the desired state.
      // Make 'walk' sticky if it was ever true during this pre-load phase.
      if (movementComponent.isMoving) {
        // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, Animations NOT loaded. movementComponent.isMoving: TRUE. Setting _pendingInitialState to 'walk'.`);
        this._pendingInitialState = 'walk';
      } else if (this._pendingInitialState !== 'walk') {
        // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, Animations NOT loaded. movementComponent.isMoving: FALSE. _pendingInitialState was '${this._pendingInitialState}', setting to 'idle'.`);
        this._pendingInitialState = 'idle';
      } else {
        // console.log(`[NET-ANIM-DBG] BasicCharacterController.Update: Entity ${entityId}, Animations NOT loaded. movementComponent.isMoving: FALSE. _pendingInitialState is already 'walk', not changing.`);
      }
      // Add a log to see how _pendingInitialState changes here
      // console.log(`[ControllerUpdate] Animations NOT loaded. movementComponent.isMoving: ${movementComponent.isMoving}. _pendingInitialState set to: ${this._pendingInitialState}`);
    }

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
