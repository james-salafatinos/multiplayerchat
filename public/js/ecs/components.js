// ECS Components
// Components are pure data containers for entities

import { Component } from './core.js';
import * as THREE from 'three';

/**
 * Transform Component
 * Stores position, rotation, and scale data
 */
export class TransformComponent extends Component {
    constructor(data = {}) {
        super({
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
            ...data
        });
    }
}

/**
 * Mesh Component
 * Stores Three.js mesh data
 */
export class MeshComponent extends Component {
    constructor(data = {}) {
        super({
            mesh: null,
            ...data
        });
    }
}

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

/**
 * NetworkSync Component
 * Marks an entity for network synchronization
 */
export class NetworkSyncComponent extends Component {
    constructor(data = {}) {
        super({
            syncProperties: [], // List of properties to sync
            ...data
        });
    }
}
