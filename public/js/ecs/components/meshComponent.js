import { Component } from '../core/index.js';

/**
 * Mesh Component
 * Stores Three.js mesh data
 */
export class MeshComponent extends Component {
    constructor(data = {}) {
        super({
            mesh: null,
            addedToScene: false,
            ...data
        });
    }
}
