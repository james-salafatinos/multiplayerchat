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

/**
 * Player Component
 * Identifies an entity as a player character and stores player-specific data
 */
export class PlayerComponent extends Component {
    constructor(data = {}) {
        super({
            playerId: null, // Socket ID of the player
            username: 'Player', // Display name of the player
            isLocalPlayer: false, // Whether this is the local player
            color: 0x3498db, // Player color
            ...data
        });
    }
}

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

/**
 * ChatBubble Component
 * Stores chat message data for display above entities
 */
export class ChatBubbleComponent extends Component {
    constructor(data = {}) {
        super({
            message: data.message || '', // The chat message content
            username: data.username || '', // Username of the sender
            timestamp: data.timestamp || Date.now(), // When the message was sent
            duration: data.duration || 2, // Duration to display in seconds
            timeRemaining: data.duration || 2, // Time remaining to display
            isVisible: data.isVisible || false, // Whether the bubble is currently visible
            element: null // Will hold the DOM element for the chat bubble
        });
    }
}
