import { Component } from '../core/index.js';


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
            color: data.color || '#3498db', // Current actual color (or default).
            desiredColor: data.color || '#3498db', // The color the player should be
            colorNeedsUpdate: true, // Flag to signal system to update mesh color
            ...data
        });
    }
}



