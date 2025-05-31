import { Component } from '../core/index.js';
import * as THREE from 'three';

/**
 * Transform Component
 * Stores position, rotation, and scale data
 */
export class TransformComponent extends Component {
    constructor(data = {}) {
        // Ensure position is a Vector3
        let position = new THREE.Vector3(0, 0, 0);
        if (data.position) {
            if (data.position instanceof THREE.Vector3) {
                position = data.position;
            } else {
                position = new THREE.Vector3(
                    data.position.x || 0,
                    data.position.y || 0,
                    data.position.z || 0
                );
            }
        }
        
        // Ensure rotation is an Euler
        let rotation = new THREE.Euler(0, 0, 0);
        if (data.rotation) {
            if (data.rotation instanceof THREE.Euler) {
                rotation = data.rotation;
            } else {
                rotation = new THREE.Euler(
                    data.rotation.x || 0,
                    data.rotation.y || 0,
                    data.rotation.z || 0
                );
            }
        }
        
        // Ensure scale is a Vector3
        let scale = new THREE.Vector3(1, 1, 1);
        if (data.scale) {
            if (data.scale instanceof THREE.Vector3) {
                scale = data.scale;
            } else {
                scale = new THREE.Vector3(
                    data.scale.x || 1,
                    data.scale.y || 1,
                    data.scale.z || 1
                );
            }
        }
        
        // Create component with properly typed properties
        super({
            position: position,
            rotation: rotation,
            scale: scale
        });
    }
}
