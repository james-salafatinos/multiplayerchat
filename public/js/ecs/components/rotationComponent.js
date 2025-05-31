import { Component } from '../core/index.js';
import * as THREE from 'three';



/**
 * Rotation Component
 * Stores rotation speed data for rotating objects
 */
export class RotationComponent extends Component {
    constructor(data = {}) {
        super({
            speed: new THREE.Vector3(0, 0, 0),
            // Rotation values for network synchronization
            networkRotation: new THREE.Euler(0, 0, 0),
            lastSyncTime: 0,
            syncInterval: 0.1, // Sync every 100ms
            ...data
        });
    }
}
