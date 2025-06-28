// Asset Loader Utility
// Handles loading and caching of 3D models and textures

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from '../modules/FBXLoader.js';

/**
 * Utility class for loading and caching 3D assets
 */
class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Cache for loaded models and textures
        this.modelCache = new Map();
        this.textureCache = new Map();
        
        // Load manager to track overall loading progress
        this.loadingManager = new THREE.LoadingManager();
        this.setupLoadingManager();
    }
    
    /**
     * Configure the loading manager with progress tracking
     */
    setupLoadingManager() {
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log(`Loading: ${itemsLoaded}/${itemsTotal} (${url})`);
        };
        
        this.loadingManager.onError = (url) => {
            console.error(`Error loading: ${url}`);
        };
    }
    
    /**
     * Load a GLTF/GLB model with caching
     * @param {string} path - Path to the model file
     * @returns {Promise<Object>} - Promise that resolves to the loaded GLTF scene
     */
    loadModel(path) {
        // Return cached model if available
        if (this.modelCache.has(path)) {
            const cachedModel = this.modelCache.get(path);
            return Promise.resolve(cachedModel.scene.clone());
        }
        
        // Load the model if not cached
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    // Cache the loaded model
                    this.modelCache.set(path, gltf);
                    // Return a clone of the scene to avoid modifying the cached version
                    resolve(gltf.scene.clone());
                },
                undefined, // onProgress callback
                (error) => {
                    console.error(`Error loading model ${path}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Clone a previously loaded model from cache
     * @param {string} path - Path of the model to clone
     * @returns {Object|null} - Cloned model or null if not in cache
     */
    getModelFromCache(path) {
        if (this.modelCache.has(path)) {
            return this.modelCache.get(path).clone();
        }
        return null;
    }
    
    /**
     * Load a texture with caching
     * @param {string} path - Path to the texture file
     * @returns {Promise<THREE.Texture>} - Promise that resolves to the loaded texture
     */
    loadTexture(path) {
        // Return cached texture if available
        if (this.textureCache.has(path)) {
            return Promise.resolve(this.textureCache.get(path).clone());
        }
        
        // Load the texture if not cached
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    // Cache the loaded texture
                    this.textureCache.set(path, texture);
                    resolve(texture);
                },
                undefined, // onProgress callback
                (error) => {
                    console.error(`Error loading texture ${path}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Preload a list of assets
     * @param {Array<string>} modelPaths - List of model paths to preload
     * @returns {Promise<void>} - Promise that resolves when all assets are loaded
     */
    preloadAssets(modelPaths) {
        const promises = modelPaths.map(path => this.loadModel(path));
        return Promise.all(promises);
    }
}

// Create a singleton instance for global use
const assetLoader = new AssetLoader();

export { assetLoader };

// --- Unified loader helpers (GLTF & FBX) ---
// Shared loading manager for progress & caching
const _loadingManager = new THREE.LoadingManager();

const _gltfLoader = new GLTFLoader(_loadingManager);
const _fbxLoader  = new FBXLoader(_loadingManager);

const _modelCache = new Map();

/**
 * Internal GLTF loader
 */
async function _loadGLTF(path, { scale = 1 } = {}) {
  if (_modelCache.has(path)) {
    return _modelCache.get(path);
  }
  const gltf = await new Promise((res, rej) =>
    _gltfLoader.load(path, res, undefined, rej)
  );
  const obj = (gltf.scene || gltf).clone(true);
  obj.scale.setScalar(scale);
  _modelCache.set(path, obj);
  return obj;
}

/**
 * Internal FBX loader
 */
async function _loadFBX(path, { scale = 1 } = {}) {
  if (_modelCache.has(path)) {
    return _modelCache.get(path);
  }
  const obj = await new Promise((res, rej) =>
    _fbxLoader.load(path, res, undefined, rej)
  );
  obj.scale.setScalar(scale);
  _modelCache.set(path, obj);
  return obj;
}

/**
 * Public unified model loader
 */
export async function loadModel(path, opts = {}) {
  if (path.toLowerCase().endsWith('.fbx')) {
    return _loadFBX(path, opts);
  }
  return _loadGLTF(path, opts);
}

/**
 * Deep clone helper (preserves skeletons, materials, etc.)
 */
export function clone(object3D) {
  return object3D.clone(true);
}

/**
 * Generates a simple fallback mesh to show when loading fails.
 */
export function makeFallback({ color = 0xff00ff, size = 0.5 } = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color })
  );
}

/**
 * Preload a set of models in the background.
 */
export function preload(paths = []) {
  paths.forEach((p) => loadModel(p).catch(console.warn));
}
