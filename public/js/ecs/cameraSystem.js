// Camera System
// Handles updating the camera to follow the player while allowing free orbit rotation

import { System } from './core.js';
import { getCamera, getControls } from '../three-setup.js';
import * as THREE from 'three';

/**
 * Camera System
 * Maintains a fixed distance from the player while allowing full rotation
 */
export class CameraSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['PlayerComponent', 'TransformComponent'];
        this.camera = getCamera();
        this.controls = getControls();
        
        // Fixed camera distance properties
        this.fixedDistance = 15; // Fixed distance from player
        this.heightOffset = 15;   // Height offset above player
        this.dampingFactor = 0.99; // How quickly camera catches up
        
        // Store the initial camera-to-target vector for maintaining distance
        this.initialCameraVector = new THREE.Vector3();
        if (this.camera && this.controls) {
            this.initialCameraVector.subVectors(this.camera.position, this.controls.target);
            this.initialCameraVector.normalize().multiplyScalar(this.fixedDistance);
        }
        
        // Ensure orbit controls are properly configured
        if (this.controls) {
            this.controls.enableRotate = true;
            this.controls.enablePan = false; // Disable panning to maintain fixed distance
            this.controls.enableZoom = true;
            
            // Set damping for smooth camera movement
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
        }
    }

    /**
     * Process an entity with this system
     * @param {Entity} entity - The entity to process
     * @param {number} deltaTime - Time since last update in seconds
     */
    processEntity(entity, deltaTime) {
        const playerComponent = entity.getComponent('PlayerComponent');
        
        // Only follow the local player
        if (playerComponent.isLocalPlayer) {
            const transformComponent = entity.getComponent('TransformComponent');
            
            if (this.controls && this.camera) {
                // Get the current orbital position of the camera relative to the target
                const currentOffset = new THREE.Vector3().subVectors(
                    this.camera.position,
                    this.controls.target
                );
                
                // Immediately update the target to the player's position (no lerp/damping)
                this.controls.target.copy(transformComponent.position);
                
                // Apply the same offset to maintain the camera's relative position
                // This ensures the camera moves in lockstep with the player
                this.camera.position.copy(transformComponent.position).add(currentOffset);
                
                // Update controls
                this.controls.update();
            }
        }
    }
}
