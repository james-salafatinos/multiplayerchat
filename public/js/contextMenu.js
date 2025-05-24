// Context Menu System
// Handles right-click context menu functionality

/**
 * Context Menu Manager
 * Creates and manages right-click context menus
 */
export class ContextMenuManager {
    constructor() {
        // Create menu element
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'context-menu';
        this.menuElement.style.display = 'none';
        document.body.appendChild(this.menuElement);
        
        // Track active state
        this.isActive = false;
        
        // Track current target (for item interactions)
        this.currentTarget = null;
        
        // Bind event handlers
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleClick = this.handleClick.bind(this);
        
        // Add event listeners
        document.addEventListener('contextmenu', this.handleContextMenu);
        document.addEventListener('click', this.handleClick);
        
        // Close menu on window resize
        window.addEventListener('resize', () => this.hideMenu());
        
        // Close menu on scroll
        window.addEventListener('scroll', () => this.hideMenu());
    }
    
    /**
     * Handle right-click context menu event
     * @param {MouseEvent} event - The context menu event
     */
    handleContextMenu(event) {
        // Prevent default context menu
        event.preventDefault();
        
        // Get mouse position
        const x = event.clientX;
        const y = event.clientY;
        
        // Dispatch custom event for systems to detect what was clicked
        const contextMenuEvent = new CustomEvent('context-menu-requested', {
            detail: {
                x,
                y,
                clientX: event.clientX,
                clientY: event.clientY,
                target: event.target
            }
        });
        document.dispatchEvent(contextMenuEvent);
    }
    
    /**
     * Handle click event (to close menu)
     * @param {MouseEvent} event - The click event
     */
    handleClick(event) {
        // If menu is active and click is outside menu, hide it
        if (this.isActive && !this.menuElement.contains(event.target)) {
            this.hideMenu();
        }
    }
    
    /**
     * Show context menu at specific position with menu items
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Array} items - Array of menu item objects
     * @param {Object} targetData - Data about the target being clicked
     */
    showMenu(x, y, items, targetData = null) {
        // Store current target data
        this.currentTarget = targetData;
        
        // Clear existing menu items
        this.menuElement.innerHTML = '';
        
        // Add menu items
        items.forEach((item, index) => {
            if (item.separator) {
                // Add separator
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                this.menuElement.appendChild(separator);
            } else {
                // Add menu item
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                
                if (item.highlight) {
                    menuItem.classList.add('highlight');
                }
                
                if (item.disabled) {
                    menuItem.classList.add('disabled');
                }
                
                menuItem.textContent = item.label;
                
                // Add click handler if not disabled
                if (!item.disabled) {
                    menuItem.addEventListener('click', () => {
                        // Execute action
                        if (item.action) {
                            item.action(this.currentTarget);
                        }
                        
                        // Hide menu after action
                        this.hideMenu();
                    });
                }
                
                this.menuElement.appendChild(menuItem);
            }
        });
        
        // Position menu
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        
        // Check if menu goes off screen
        const menuRect = this.menuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust horizontal position if needed
        if (x + menuRect.width > viewportWidth) {
            this.menuElement.style.left = `${viewportWidth - menuRect.width - 5}px`;
        }
        
        // Adjust vertical position if needed
        if (y + menuRect.height > viewportHeight) {
            this.menuElement.style.top = `${viewportHeight - menuRect.height - 5}px`;
        }
        
        // Show menu
        this.menuElement.style.display = 'block';
        this.isActive = true;
    }
    
    /**
     * Hide context menu
     */
    hideMenu() {
        this.menuElement.style.display = 'none';
        this.isActive = false;
        this.currentTarget = null;
    }
    
    /**
     * Check if context menu is currently active
     * @returns {boolean} True if menu is active
     */
    isMenuActive() {
        return this.isActive;
    }
}

// Singleton instance
let contextMenuManager = null;

/**
 * Get the context menu manager instance
 * @returns {ContextMenuManager} The context menu manager
 */
export function getContextMenuManager() {
    if (!contextMenuManager) {
        contextMenuManager = new ContextMenuManager();
    }
    return contextMenuManager;
}
