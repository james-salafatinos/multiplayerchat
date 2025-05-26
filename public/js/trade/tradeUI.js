/**
 * Trade UI Components Module
 * 
 * Contains UI components for the trade system
 */

/**
 * Create a side of the trade window (local or remote player)
 * @param {string} playerName - Name of the player
 * @param {string} side - 'local' or 'remote'
 * @returns {HTMLElement} The created side element
 */
export function createTradeSide(playerName, side) {
    const sideElement = document.createElement('div');
    sideElement.className = `trade-side ${side}-side`;
    Object.assign(sideElement.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column'
    });

    // Player name header
    const playerHeader = document.createElement('div');
    playerHeader.className = 'player-header';
    Object.assign(playerHeader.style, {
        padding: '5px',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: '10px'
    });
    playerHeader.textContent = playerName;

    // Create offered items section
    const offeredSection = document.createElement('div');
    offeredSection.className = 'offered-section';
    Object.assign(offeredSection.style, {
        flex: '1',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        padding: '5px',
        marginBottom: '10px',
        display: 'flex',
        flexDirection: 'column'
    });

    // Create offered items header
    const offeredHeader = document.createElement('div');
    offeredHeader.className = 'offered-header';
    Object.assign(offeredHeader.style, {
        textAlign: 'center',
        fontSize: '14px',
        marginBottom: '5px'
    });
    offeredHeader.textContent = 'Offered Items';
    offeredSection.appendChild(offeredHeader);

    // Create offered items grid
    const offeredGrid = document.createElement('div');
    offeredGrid.className = `${side}-offered-items`;
    Object.assign(offeredGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '5px',
        padding: '5px',
        flex: '1'
    });
    offeredSection.appendChild(offeredGrid);

    // Add sections to side
    sideElement.appendChild(playerHeader);
    sideElement.appendChild(offeredSection);

    return sideElement;
}

/**
 * Create an offered item slot
 * @param {Object} item - The item to display
 * @param {number} index - Index in the offered items array
 * @param {string} side - 'local' or 'remote'
 * @returns {HTMLElement} The created item slot
 */
export function createOfferedItemSlot(item, index, side) {
    const itemSlot = document.createElement('div');
    itemSlot.className = 'offered-slot';
    Object.assign(itemSlot.style, {
        width: '40px',
        height: '40px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '3px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '10px',
        color: 'white',
        cursor: side === 'local' ? 'pointer' : 'default'
    });

    // Get item color from inventory system
    const itemColor = getItemColor(item.id);
    
    // Create item display
    const itemDisplay = document.createElement('div');
    itemDisplay.className = 'inventory-item';
    Object.assign(itemDisplay.style, {
        width: '90%',
        height: '90%',
        backgroundColor: itemColor,
        borderRadius: '3px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '8px'
    });
    itemDisplay.textContent = item.name.substring(0, 3);
    
    // Set tooltip
    itemSlot.title = `${item.name}\n${item.description || ''}`;
    
    // Add click handler to remove item (only for local items)
    if (side === 'local') {
        itemSlot.addEventListener('click', () => {
            // Import here to avoid circular dependency
            const { removeOfferedItem } = require('./tradeItems.js');
            removeOfferedItem(index);
        });
    }
    
    itemSlot.appendChild(itemDisplay);
    return itemSlot;
}

/**
 * Create an empty offered slot
 * @returns {HTMLElement} The created empty slot
 */
export function createEmptyOfferedSlot() {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'offered-slot empty';
    Object.assign(emptySlot.style, {
        width: '40px',
        height: '40px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '3px'
    });
    return emptySlot;
}

/**
 * Get a color for an item based on its ID
 * @param {number} itemId - The item ID
 * @returns {string} The color as a CSS string
 */
function getItemColor(itemId) {
    // Generate a color based on the item ID
    const hue = (itemId * 137) % 360;
    return `hsl(${hue}, 70%, 60%)`;
}
