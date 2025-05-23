// Three.js initialization and setup
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Module variables
let scene, camera, renderer, controls;
let container;

/**
 * Initialize the Three.js environment
 * @returns {Object} The Three.js scene
 */
export function initThreeJS() {
    // Get the container element
    container = document.getElementById('scene-container');
    
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Create the camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    return scene;
}

/**
 * Handle window resize
 */
function onWindowResize() {
    // Update camera
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Get the Three.js scene
 * @returns {THREE.Scene} The scene
 */
export function getScene() {
    return scene;
}

/**
 * Get the Three.js camera
 * @returns {THREE.Camera} The camera
 */
export function getCamera() {
    return camera;
}

/**
 * Get the Three.js renderer
 * @returns {THREE.WebGLRenderer} The renderer
 */
export function getRenderer() {
    return renderer;
}

/**
 * Render the scene
 */
export function render() {
    controls.update();
    renderer.render(scene, camera);
}
