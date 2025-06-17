// Asset Loader Utility
// Handles loading and caching of 3D models and textures

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
