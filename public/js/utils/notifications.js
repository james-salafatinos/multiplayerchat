// notifications.js
// Utility for showing in-game notifications
console.log('Notifications.js loaded')
/**
 * Shows a notification on the screen
 * @param {string} message - The message to display
 * @param {string} type - The notification type ('success', 'error', 'info')
 * @param {number} duration - How long to show the notification in ms
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add base styles
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        notificationContainer.style.display = 'flex';
        notificationContainer.style.flexDirection = 'column';
        notificationContainer.style.alignItems = 'flex-end';
        notificationContainer.style.gap = '10px';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    notification.style.animation = 'fadeIn 0.3s ease-out';
    notification.style.maxWidth = '300px';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
    
    // Set type-specific styles
    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
            notification.style.color = 'white';
            break;
        case 'error':
            notification.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
            notification.style.color = 'white';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
            notification.style.color = 'white';
            break;
    }
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}
