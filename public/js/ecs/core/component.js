/**
 * Component Base Class
 * Components are pure data containers
 */
export class Component {
    constructor(data = {}) {
        Object.assign(this, data);
    }
}
