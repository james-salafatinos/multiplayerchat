/**
 * Trade System Utilities
 * 
 * Utility functions for the trade system
 */

/**
 * Show a notification message
 * @param {string} message - The message to show
 */
export function showNotification(message) {
    // Check if notification element exists
    let notification = document.getElementById('trade-notification');
    
    if (!notification) {
        // Create notification element
        notification = document.createElement('div');
        notification.id = 'trade-notification';
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            zIndex: '2001',
            transition: 'opacity 0.3s ease',
            opacity: '0'
        });
        document.body.appendChild(notification);
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        
        // Remove after fade out
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
