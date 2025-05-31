import { Component } from '../core/index.js';
import * as THREE from 'three';



/**
 * Light Component
 * Stores Three.js light data
 */
export class LightComponent extends Component {
    constructor(data = {}) {
        super({
            light: null,
            ...data
        });
    }
}
