// public/js/character/character-input.js
export class BasicCharacterControllerInput {
  constructor() {
    this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      down: false, // 'q' key in original code, mapped to KeyQ
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.code) { // Using event.code for better layout independence
      case 'KeyW': // w
        this._keys.forward = true;
        break;
      case 'KeyA': // a
        this._keys.left = true;
        break;
      case 'KeyS': // s
        this._keys.backward = true;
        break;
      case 'KeyD': // d
        this._keys.right = true;
        break;
      case 'Space': // SPACE
        this._keys.space = true;
        break;
      case 'ShiftLeft': // Left SHIFT
      case 'ShiftRight': // Right SHIFT
        this._keys.shift = true;
        break;
      case 'KeyQ': // Q for 'down' (as per original comment)
        this._keys.down = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) { // Using event.code
      case 'KeyW': // w
        this._keys.forward = false;
        break;
      case 'KeyA': // a
        this._keys.left = false;
        break;
      case 'KeyS': // s
        this._keys.backward = false;
        break;
      case 'KeyD': // d
        this._keys.right = false;
        break;
      case 'Space': // SPACE
        this._keys.space = false;
        break;
      case 'ShiftLeft': // Left SHIFT
      case 'ShiftRight': // Right SHIFT
        this._keys.shift = false;
        break;
      case 'KeyQ': // Q for 'down'
        this._keys.down = false;
        break;
    }
  }
}
