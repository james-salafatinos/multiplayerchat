// Signup functionality
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const errorMessage = document.getElementById('error-message');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Handle form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate inputs
        if (!username || !password || !confirmPassword) {
            showError('All fields are required');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                showError(data.error || 'Signup failed');
                return;
            }
            
            // Show success message and redirect to login page
            showSuccess('Account created successfully! Redirecting to login...');
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } catch (error) {
            console.error('Signup error:', error);
            showError('An error occurred during signup. Please try again.');
        }
    });
    
    // Helper function to show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.className = 'error-message show';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    }
    
    // Helper function to show success message
    function showSuccess(message) {
        errorMessage.textContent = message;
        errorMessage.className = 'success-message show';
    }
    
    // Check if user is already authenticated
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                // User is already logged in, redirect to game
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }
});
