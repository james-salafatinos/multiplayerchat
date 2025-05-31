import { Component } from '../core/component.js';

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
