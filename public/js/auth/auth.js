// Authentication module for client-side application
import { setAuthenticatedUser } from '../network.js';

let currentUser = null;
let sessionCheckInterval = null;
const SESSION_CHECK_INTERVAL = 10000; // Check session every 10 seconds

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
            
            if (data.sessionEnded) {
                // This session was terminated because user logged in elsewhere
                localStorage.removeItem('user');
                currentUser = null;
                
                // Notify the user if we're not already on the login page
                if (!window.location.pathname.endsWith('login.html')) {
                    alert('This session has been terminated because you logged in from another location.');
                    window.location.href = '/login.html';
                }
                return null;
            }
            
            if (!data.authenticated) {
                // Session expired or invalid, clear local storage
                localStorage.removeItem('user');
                currentUser = null;
                return null;
            }
            
            // Start session checking if not already started
            if (!sessionCheckInterval) {
                startSessionChecking();
            }
            
            return currentUser;
        }
        
        return null;
    } catch (error) {
        console.error('Error initializing auth:', error);
        return null;
    }
}

// Start periodic session checking
function startSessionChecking() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    
    sessionCheckInterval = setInterval(async () => {
        try {
            // Only check if we have a current user
            if (!currentUser) return;
            
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (!data.authenticated) {
                // Session is no longer authenticated
                localStorage.removeItem('user');
                currentUser = null;
                
                if (sessionCheckInterval) {
                    clearInterval(sessionCheckInterval);
                    sessionCheckInterval = null;
                }
                
                // If session was specifically ended, show that message
                if (data.sessionEnded) {
                    // Notify user and redirect to login
                    alert(data.message || 'Your session has ended. Please log in again.');
                }
                
                // Redirect to login if not already there
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = '/login.html';
                }
            }
        } catch (error) {
            console.error('Error checking session status:', error);
        }
    }, SESSION_CHECK_INTERVAL);
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
            method: 'POST',
            credentials: 'same-origin' // Important for session cookies
        });
        
        if (response.ok) {
            // Clear local storage and current user
            localStorage.removeItem('user');
            currentUser = null;
            
            // Clear the session checking interval
            if (sessionCheckInterval) {
                clearInterval(sessionCheckInterval);
                sessionCheckInterval = null;
            }
            
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
