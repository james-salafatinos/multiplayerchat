// Authentication module for client-side application
import { setAuthenticatedUser } from '../network.js';

let currentUser = null;

/**
 * Initialize the authentication module
 * @returns {Promise<Object|null>} The current user if authenticated, null otherwise
 */
export async function initAuth() {
    try {
        // Check if user is stored in localStorage
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
            // Parse stored user data
            currentUser = JSON.parse(storedUser);
            
            // Verify with server that session is still valid
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (!data.authenticated) {
                // Session expired or invalid, clear local storage
                localStorage.removeItem('user');
                currentUser = null;
                return null;
            }
            
            return currentUser;
        }
        
        return null;
    } catch (error) {
        console.error('Error initializing auth:', error);
        return null;
    }
}

/**
 * Get the current authenticated user
 * @returns {Object|null} The current user if authenticated, null otherwise
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Logout the current user
 * @returns {Promise<boolean>} True if logout was successful, false otherwise
 */
export async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            // Clear local storage and current user
            localStorage.removeItem('user');
            currentUser = null;
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error logging out:', error);
        return false;
    }
}

/**
 * Set the current user
 * @param {Object} user - The user object
 */
export function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    
    // Update the authenticated user in the network module
    setAuthenticatedUser(user);
}
