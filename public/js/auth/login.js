// Login functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showError('Username and password are required');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Special handling for account already in use
                if (data.error === 'Account already in use') {
                    showError(data.message || 'This account is currently in use on another device or browser');
                } else {
                    showError(data.error || 'Login failed');
                }
                return;
            }
            
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to game
            window.location.href = '/';
        } catch (error) {
            console.error('Login error:', error);
            showError('An error occurred during login. Please try again.');
        }
    });
    
    // Helper function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
    
    // Check if user is already authenticated
    async function checkAuthStatus() {
        // Don't redirect if we're already on the login page
        if (window.location.pathname.endsWith('login.html')) {
            return;
        }
        
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                // Only redirect if we're not already on the root path
                if (!window.location.pathname.endsWith('/')) {
                    window.location.href = '/';
                }
            } else {
                // If not authenticated and not on login page, redirect to login
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // On error, redirect to login page if not already there
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = '/login.html';
            }
        }
    }
});
