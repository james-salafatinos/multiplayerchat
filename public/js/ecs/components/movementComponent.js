import { Component } from '../core/index.js';
import * as THREE from 'three';

/**
 * Movement Component
 * Stores movement-related data for entities that can move
 */
export class MovementComponent extends Component {
    constructor(data = {}) {
        // Ensure targetPosition is a Vector3
        let targetPosition = new THREE.Vector3(0, 0, 0);
        if (data.targetPosition) {
            if (data.targetPosition instanceof THREE.Vector3) {
                targetPosition = data.targetPosition;
            } else {
                targetPosition = new THREE.Vector3(
                    data.targetPosition.x || 0,
                    data.targetPosition.y || 0,
                    data.targetPosition.z || 0
                );
            }
        }
        
        // Create component with properly typed properties
        super({
            targetPosition: targetPosition,
            speed: data.speed || 5, // Movement speed in units per second
            isMoving: data.isMoving || false, // Whether the entity is currently moving
            lastSyncTime: data.lastSyncTime || 0, // Time since last network sync
            syncInterval: data.syncInterval || 0.1 // Sync every 100ms
        });
    }
}
