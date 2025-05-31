import { Component } from '../core/index.js';

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
