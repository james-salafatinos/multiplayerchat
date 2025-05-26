// Trade System
// Handles player-to-player trading functionality

/**
 * Trade System
 * Manages the UI and logic for player-to-player trading
 */

// Keep track of active trades and pending requests
let activeTrade = null;
let pendingTradeRequests = new Map(); // Map of pending trade requests by player ID

/**
 * Request a trade with another player
 * @param {Object} options - Trade options
 * @param {string} options.localPlayerId - ID of the local player
 * @param {string} options.localPlayerName - Name of the local player
 * @param {string} options.remotePlayerId - ID of the remote player
 * @param {string} options.remotePlayerName - Name of the remote player
 * @param {Object} options.socket - Socket.io connection
 */
export function requestTrade(options) {
    console.log('Requesting trade with player:', options.remotePlayerName);
    
    // Check if there's an active trade already
    if (activeTrade) {
        console.log('Cannot request trade: Another trade is already active');
        showNotification('Cannot request trade: Another trade is already active');
        return;
    }
    
    // Store the pending trade request
    pendingTradeRequests.set(options.remotePlayerId, {
        localPlayerId: options.localPlayerId,
        localPlayerName: options.localPlayerName,
        remotePlayerId: options.remotePlayerId,
        remotePlayerName: options.remotePlayerName,
        socket: options.socket
    });

    // Send trade request to server
    options.socket.emit('trade request', {
        fromPlayerId: options.localPlayerId,
        toPlayerId: options.remotePlayerId
    });

    // Show notification that trade request was sent
    showNotification(`Trade request sent to ${options.remotePlayerName}`); 
}

/**
 * Handle incoming trade request
 * @param {Object} data - Trade request data
 * @param {string} data.fromPlayerId - ID of the player requesting the trade
 * @param {string} data.fromPlayerName - Name of the player requesting the trade
 * @param {string} data.tradeId - ID of the trade
 * @param {Object} socket - Socket.io connection
 * @param {string} localPlayerId - ID of the local player
 * @param {string} localPlayerName - Name of the local player
 */
export function handleTradeRequest(data, socket, localPlayerId, localPlayerName) {
    console.log('Handling trade request in chat:', data);
    
    // Add a chat message with accept button
    const chatContainer = document.querySelector('#chat-messages');
    if (!chatContainer) {
        console.error('Chat container not found');
        return;
    }

    // Create trade request message container
    const requestContainer = document.createElement('div');
    requestContainer.className = 'trade-request-message';
    requestContainer.dataset.tradeId = data.tradeId;
    requestContainer.dataset.fromPlayerId = data.fromPlayerId;
    
    // Style the container to make it stand out
    Object.assign(requestContainer.style, {
        padding: '12px',
        margin: '10px 0',
        backgroundColor: 'rgba(41, 128, 185, 0.3)',
        borderRadius: '8px',
        border: '2px solid rgba(52, 152, 219, 0.7)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
    });

    // Create message text with icon
    const messageText = document.createElement('div');
    messageText.innerHTML = `<strong>📦 TRADE REQUEST</strong><br>${data.fromPlayerName} wishes to trade with you.`;
    messageText.style.marginBottom = '8px';
    messageText.style.fontSize = '14px';

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '12px';

    // Create accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    Object.assign(acceptButton.style, {
        padding: '8px 16px',
        backgroundColor: '#2ecc71',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: '1',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    });
    
    // Add hover effect
    acceptButton.addEventListener('mouseover', () => {
        acceptButton.style.backgroundColor = '#27ae60';
    });
    acceptButton.addEventListener('mouseout', () => {
        acceptButton.style.backgroundColor = '#2ecc71';
    });

    // Create decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    Object.assign(declineButton.style, {
        padding: '8px 16px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: '1',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    });
    
    // Add hover effect
    declineButton.addEventListener('mouseover', () => {
        declineButton.style.backgroundColor = '#c0392b';
    });
    declineButton.addEventListener('mouseout', () => {
        declineButton.style.backgroundColor = '#e74c3c';
    });

    // Add event listeners
    acceptButton.addEventListener('click', () => {
        // Accept the trade request
        socket.emit('trade request response', {
            fromPlayerId: data.fromPlayerId,
            toPlayerId: localPlayerId,
            accepted: true
        });

        // Show the trade window
        showTradeWindow({
            localPlayerId: localPlayerId,
            localPlayerName: localPlayerName,
            remotePlayerId: data.fromPlayerId,
            remotePlayerName: data.fromPlayerName,
            socket: socket
        });

        // Remove the request message
        requestContainer.remove();
    });

    declineButton.addEventListener('click', () => {
        // Decline the trade request
        socket.emit('trade request response', {
            fromPlayerId: data.fromPlayerId,
            toPlayerId: localPlayerId,
            accepted: false
        });

        // Remove the request message
        requestContainer.remove();
    });

    // Assemble the message
    buttonsContainer.appendChild(acceptButton);
    buttonsContainer.appendChild(declineButton);
    requestContainer.appendChild(messageText);
    requestContainer.appendChild(buttonsContainer);

    // Add to chat
    chatContainer.appendChild(requestContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Also show a notification
    showNotification(`${data.fromPlayerName} wishes to trade with you`);
}

/**
 * Handle trade request response
 * @param {Object} data - Trade request response data
 */
export function handleTradeRequestResponse(data) {
    // Check if we have a pending request for this player
    const request = pendingTradeRequests.get(data.toPlayerId);
    if (!request) return;

    // Remove the pending request
    pendingTradeRequests.delete(data.toPlayerId);

    // If accepted, show the trade window
    if (data.accepted) {
        showTradeWindow(request);
        showNotification(`${request.remotePlayerName} accepted your trade request`);
    } else {
        showNotification(`${request.remotePlayerName} declined your trade request`);
    }
}

/**
 * Show the trade window for a trade between two players
 * @param {Object} options - Trade options
 * @param {string} options.localPlayerId - ID of the local player
 * @param {string} options.localPlayerName - Name of the local player
 * @param {string} options.remotePlayerId - ID of the remote player
 * @param {string} options.remotePlayerName - Name of the remote player
 * @param {Object} options.socket - Socket.io connection
 */
export function showTradeWindow(options) {
    console.log('Showing trade window with options:', options);
    
    // Check if there's already an active trade
    if (activeTrade) {
        console.log('Trade window is already open');
        return;
    }
    
    // Set up active trade
    activeTrade = {
        localPlayerId: options.localPlayerId,
        localPlayerName: options.localPlayerName,
        remotePlayerId: options.remotePlayerId,
        remotePlayerName: options.remotePlayerName,
        socket: options.socket,
        localItems: [],
        remoteItems: [],
        localAccepted: false,
        remoteAccepted: false,
        status: 'active'
    };
    
    // Create trade window UI
    createTradeWindowUI();
    
    // Set up socket event listeners
    setupTradeEventListeners();
    
    // Set up right-click context menu for inventory items
    setupInventoryContextMenu();
    
    // Make sure the inventory is visible so items can be clicked
    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer) {
        console.log('Making inventory visible for trading');
        inventoryContainer.style.display = 'flex';
        
        // Set up click handlers for inventory items
        // Use setTimeout to ensure the inventory is fully visible
        setTimeout(() => {
            setupInventoryItemClickHandlers();
        }, 100);
    } else {
        console.warn('Inventory container not found!');
    }
    
    // Show a notification to the user about how to trade
    showNotification('Click on items in your inventory to add them to the trade');
}

/**
 * Create the trade window UI
 */
function createTradeWindowUI() {
    // Create the main trade window container
    const tradeWindow = document.createElement('div');
    tradeWindow.id = 'trade-window';
    tradeWindow.className = 'trade-window';
    
    // Apply styles
    Object.assign(tradeWindow.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px',
        height: '400px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: '2000',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
    });

    // Create header
    const header = document.createElement('div');
    header.className = 'trade-header';
    Object.assign(header.style, {
        padding: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    });

    // Create title
    const title = document.createElement('h2');
    title.textContent = `Trading with ${activeTrade.remotePlayerName}`;
    title.style.margin = '0';
    title.style.fontSize = '18px';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    Object.assign(closeButton.style, {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer'
    });
    closeButton.addEventListener('click', () => {
        cancelTrade();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    tradeWindow.appendChild(header);

    // Create trade content area
    const content = document.createElement('div');
    content.className = 'trade-content';
    Object.assign(content.style, {
        display: 'flex',
        flex: '1',
        padding: '10px'
    });

    // Create local player side
    const localSide = createTradeSide(activeTrade.localPlayerName, 'local');
    
    // Create divider
    const divider = document.createElement('div');
    Object.assign(divider.style, {
        width: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        margin: '0 10px'
    });

    // Create remote player side
    const remoteSide = createTradeSide(activeTrade.remotePlayerName, 'remote');

    content.appendChild(localSide);
    content.appendChild(divider);
    content.appendChild(remoteSide);
    tradeWindow.appendChild(content);

    // Create footer with accept/decline buttons
    const footer = document.createElement('div');
    footer.className = 'trade-footer';
    Object.assign(footer.style, {
        padding: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between'
    });

    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.id = 'trade-status';
    statusMessage.textContent = 'Waiting for both players to accept...';
    Object.assign(statusMessage.style, {
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.7)'
    });

    // Buttons container
    const buttonsContainer = document.createElement('div');
    Object.assign(buttonsContainer.style, {
        display: 'flex',
        gap: '10px'
    });

    // Decline button
    const declineButton = document.createElement('button');
    declineButton.textContent = 'Decline';
    declineButton.id = 'trade-decline';
    Object.assign(declineButton.style, {
        padding: '8px 16px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    declineButton.addEventListener('click', () => {
        cancelTrade();
    });

    // Accept button
    const acceptButton = document.createElement('button');
    acceptButton.textContent = 'Accept';
    acceptButton.id = 'trade-accept';
    Object.assign(acceptButton.style, {
        padding: '8px 16px',
        backgroundColor: '#2ecc71',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    acceptButton.addEventListener('click', () => {
        toggleAcceptTrade();
    });

    buttonsContainer.appendChild(declineButton);
    buttonsContainer.appendChild(acceptButton);
    
    footer.appendChild(statusMessage);
    footer.appendChild(buttonsContainer);
    tradeWindow.appendChild(footer);

    // Add to document
    document.body.appendChild(tradeWindow);

    // Update the trade window with inventory items
    updateTradeWindowItems();
}

/**
 * Create a side of the trade window (local or remote player)
 * @param {string} playerName - Name of the player
 * @param {string} side - 'local' or 'remote'
 * @returns {HTMLElement} The created side element
 */
function createTradeSide(playerName, side) {
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
 * Update the trade window with offered items
 */
function updateTradeWindowItems() {
    // Update offered items
    updateOfferedItems();
    
    // Set up click handlers for inventory items
    setupInventoryItemClickHandlers();
}

/**
 * Update the offered items in the trade window
 */
function updateOfferedItems() {
    const localOfferedGrid = document.querySelector('.local-offered-items');
    const remoteOfferedGrid = document.querySelector('.remote-offered-items');
    
    if (!localOfferedGrid || !remoteOfferedGrid) return;

    // Clear existing offered items
    localOfferedGrid.innerHTML = '';
    remoteOfferedGrid.innerHTML = '';

    // Add local offered items
    activeTrade.localItems.forEach((item, index) => {
        const itemSlot = createOfferedItemSlot(item, index, 'local');
        localOfferedGrid.appendChild(itemSlot);
    });

    // Add remote offered items
    activeTrade.remoteItems.forEach((item, index) => {
        const itemSlot = createOfferedItemSlot(item, index, 'remote');
        remoteOfferedGrid.appendChild(itemSlot);
    });

    // Fill remaining slots with empty slots
    const maxOfferedItems = 8; // 2 rows of 4 items
    
    for (let i = activeTrade.localItems.length; i < maxOfferedItems; i++) {
        const emptySlot = createEmptyOfferedSlot();
        localOfferedGrid.appendChild(emptySlot);
    }
    
    for (let i = activeTrade.remoteItems.length; i < maxOfferedItems; i++) {
        const emptySlot = createEmptyOfferedSlot();
        remoteOfferedGrid.appendChild(emptySlot);
    }

    // Update trade status
    updateTradeStatus();
}

/**
 * Create an offered item slot
 * @param {Object} item - The item to display
 * @param {number} index - Index in the offered items array
 * @param {string} side - 'local' or 'remote'
 * @returns {HTMLElement} The created item slot
 */
function createOfferedItemSlot(item, index, side) {
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
function createEmptyOfferedSlot() {
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
 * Offer an item for trade
 * @param {number} inventoryIndex - Index of the item in the inventory
 * @param {Object} item - The item to offer
 */
function offerItem(inventoryIndex, item) {
    // Check if trade is still in a state where we can modify offers
    if (activeTrade.localAccepted || activeTrade.remoteAccepted) {
        // Reset acceptance if items change
        activeTrade.localAccepted = false;
        activeTrade.remoteAccepted = false;
        
        // Update UI to reflect this
        const acceptButton = document.getElementById('trade-accept');
        if (acceptButton) {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
        
        // Notify the other player that we've modified our offer
        activeTrade.socket.emit('trade modify', {
            fromPlayerId: activeTrade.localPlayerId,
            toPlayerId: activeTrade.remotePlayerId
        });
    }
    
    // Check if item is already offered
    const alreadyOfferedIndex = activeTrade.localItems.findIndex(offeredItem => 
        offeredItem.inventoryIndex === inventoryIndex
    );
    
    if (alreadyOfferedIndex !== -1) {
        // Item is already offered, remove it
        removeOfferedItem(alreadyOfferedIndex);
        return;
    }
    
    // Add item to offered items with its inventory index
    activeTrade.localItems.push({
        ...item,
        inventoryIndex: inventoryIndex
    });
    
    // Update the UI
    updateOfferedItems();
    
    // Send update to server
    activeTrade.socket.emit('trade update', {
        fromPlayerId: activeTrade.localPlayerId,
        toPlayerId: activeTrade.remotePlayerId,
        offeredItems: activeTrade.localItems
    });
}

/**
 * Remove an offered item
 * @param {number} index - Index of the item in the offered items array
 */
function removeOfferedItem(index) {
    // Check if trade is still in a state where we can modify offers
    if (activeTrade.localAccepted || activeTrade.remoteAccepted) {
        // Reset acceptance if items change
        activeTrade.localAccepted = false;
        activeTrade.remoteAccepted = false;
        
        // Update UI to reflect this
        const acceptButton = document.getElementById('trade-accept');
        if (acceptButton) {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
        
        // Notify the other player that we've modified our offer
        activeTrade.socket.emit('trade modify', {
            fromPlayerId: activeTrade.localPlayerId,
            toPlayerId: activeTrade.remotePlayerId
        });
    }
    
    // Remove item from offered items
    activeTrade.localItems.splice(index, 1);
    
    // Update the UI
    updateOfferedItems();
    
    // Send update to server
    activeTrade.socket.emit('trade update', {
        fromPlayerId: activeTrade.localPlayerId,
        toPlayerId: activeTrade.remotePlayerId,
        offeredItems: activeTrade.localItems
    });
}

/**
 * Toggle accepting the trade
 */
function toggleAcceptTrade() {
    // Toggle acceptance state
    activeTrade.localAccepted = !activeTrade.localAccepted;
    
    // Update UI
    const acceptButton = document.getElementById('trade-accept');
    if (acceptButton) {
        if (activeTrade.localAccepted) {
            acceptButton.textContent = 'Cancel Accept';
            acceptButton.style.backgroundColor = '#e67e22';
        } else {
            acceptButton.textContent = 'Accept';
            acceptButton.style.backgroundColor = '#2ecc71';
        }
    }
    
    // Update trade status
    updateTradeStatus();
    
    // Send update to server
    activeTrade.socket.emit('trade accept', {
        fromPlayerId: activeTrade.localPlayerId,
        toPlayerId: activeTrade.remotePlayerId,
        accepted: activeTrade.localAccepted
    });
    
    // Check if both players have accepted
    if (activeTrade.localAccepted && activeTrade.remoteAccepted) {
        // Complete the trade
        completeTrade();
    }
}

/**
 * Update the trade status message
 */
function updateTradeStatus() {
    const statusElement = document.getElementById('trade-status');
    if (!statusElement) return;
    
    if (activeTrade.localAccepted && activeTrade.remoteAccepted) {
        statusElement.textContent = 'Trade accepted by both players!';
        statusElement.style.color = '#2ecc71';
    } else if (activeTrade.localAccepted) {
        statusElement.textContent = 'Waiting for other player to accept...';
        statusElement.style.color = '#f39c12';
    } else if (activeTrade.remoteAccepted) {
        statusElement.textContent = `${activeTrade.remotePlayerName} has accepted the trade.`;
        statusElement.style.color = '#f39c12';
    } else {
        statusElement.textContent = 'Waiting for both players to accept...';
        statusElement.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

/**
 * Complete the trade
 */
function completeTrade() {
    // Update status
    activeTrade.status = 'completed';
    
    const statusElement = document.getElementById('trade-status');
    if (statusElement) {
        statusElement.textContent = 'Trade completed successfully!';
        statusElement.style.color = '#2ecc71';
    }
    
    // Disable buttons
    const acceptButton = document.getElementById('trade-accept');
    const declineButton = document.getElementById('trade-decline');
    
    if (acceptButton) {
        acceptButton.disabled = true;
        acceptButton.style.backgroundColor = '#ccc';
        acceptButton.style.cursor = 'default';
    }
    
    if (declineButton) {
        declineButton.textContent = 'Close';
    }
    
    // Find local player entity
    const world = window.gameWorld;
    if (world) {
        const localPlayerEntity = world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (localPlayerEntity && localPlayerEntity.hasComponent('InventoryComponent')) {
            const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
            
            // Process the item exchange locally
            // 1. Remove offered items from local inventory
            activeTrade.localItems.forEach(item => {
                // Clear the slot in local inventory
                if (item.inventoryIndex !== undefined && 
                    inventoryComponent.slots[item.inventoryIndex] !== null) {
                    inventoryComponent.slots[item.inventoryIndex] = null;
                }
            });
            
            // 2. Add received items to local inventory
            activeTrade.remoteItems.forEach(item => {
                // Find an empty slot to add the received item
                const emptySlotIndex = inventoryComponent.slots.findIndex(slot => slot === null);
                if (emptySlotIndex !== -1) {
                    inventoryComponent.slots[emptySlotIndex] = {
                        id: item.id,
                        name: item.name,
                        description: item.description || ''
                    };
                } else {
                    console.warn('No empty inventory slot for received item:', item.name);
                    // Could show a notification here that inventory is full
                }
            });
            
            // Trigger an inventory update event to refresh the UI
            document.dispatchEvent(new CustomEvent('inventory-display-update'));
        }
    }
    
    // Send completion to server
    activeTrade.socket.emit('trade complete', {
        fromPlayerId: activeTrade.localPlayerId,
        toPlayerId: activeTrade.remotePlayerId,
        localItems: activeTrade.localItems,
        remoteItems: activeTrade.remoteItems
    });
    
    // Show notification about the trade results
    if (activeTrade.localItems.length > 0 && activeTrade.remoteItems.length > 0) {
        showNotification(`Exchanged ${activeTrade.localItems.length} items for ${activeTrade.remoteItems.length} items`);
    } else if (activeTrade.localItems.length > 0) {
        showNotification(`Gave ${activeTrade.localItems.length} items to ${activeTrade.remotePlayerName}`);
    } else if (activeTrade.remoteItems.length > 0) {
        showNotification(`Received ${activeTrade.remoteItems.length} items from ${activeTrade.remotePlayerName}`);
    } else {
        showNotification('Trade completed with no items exchanged');
    }
    
    // Close trade window after a delay
    setTimeout(() => {
        closeTradeWindow();
    }, 2000);
}

/**
 * Cancel the trade
 */
function cancelTrade() {
    // Update status
    activeTrade.status = 'cancelled';
    
    // Send cancellation to server
    if (activeTrade.socket) {
        activeTrade.socket.emit('trade cancel', {
            fromPlayerId: activeTrade.localPlayerId,
            toPlayerId: activeTrade.remotePlayerId
        });
    }
    
    // Close the trade window
    closeTradeWindow();
}

/**
 * Close the trade window
 */
export function closeTradeWindow() {
    console.log('Closing trade window');
    
    // Remove the trade window from the DOM
    const tradeWindow = document.getElementById('trade-window');
    if (tradeWindow) {
        tradeWindow.remove();
    }
    
    // Remove context menu event listener from inventory items
    removeInventoryContextMenu();
    
    // Clean up socket event listeners
    if (activeTrade && activeTrade.socket) {
        activeTrade.socket.off('trade update');
        activeTrade.socket.off('trade accept');
        activeTrade.socket.off('trade complete');
        activeTrade.socket.off('trade cancel');
    }
    
    // Reset active trade
    activeTrade = null;
}

/**
 * Set up socket event listeners for trade events
 */
function setupTradeEventListeners() {
    if (!activeTrade || !activeTrade.socket) return;
    
    const socket = activeTrade.socket;
    
    // Handle trade request response
    socket.on('trade request response', (data) => {
        if (data.accepted) {
            // Trade request was accepted, nothing to do as window is already open
            console.log(`Trade request accepted by ${activeTrade.remotePlayerName}`);
        } else {
            // Trade request was declined
            console.log(`Trade request declined by ${activeTrade.remotePlayerName}`);
            showNotification(`${activeTrade.remotePlayerName} declined your trade request.`);
            closeTradeWindow();
        }
    });
    
    // Listen for trade updates
    socket.on('trade update', (data) => {
        console.log('Received trade update:', data);
        
        // Make sure this update is for our active trade
        if (!activeTrade) return;
        if (data.fromPlayerId !== activeTrade.localPlayerId && data.fromPlayerId !== activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== activeTrade.localPlayerId && data.toPlayerId !== activeTrade.remotePlayerId) return;
        
        // Update the offered items
        if (data.fromPlayerId === activeTrade.remotePlayerId) {
            activeTrade.remoteItems = data.offeredItems;
            activeTrade.localAccepted = false;
            activeTrade.remoteAccepted = false;
            
            // Update the UI
            updateOfferedItems();
            updateTradeStatus();
        }
    });
    
    // Listen for trade acceptance
    socket.on('trade accept', (data) => {
        console.log('Received trade acceptance:', data);
        
        // Make sure this update is for our active trade
        if (!activeTrade) return;
        if (data.fromPlayerId !== activeTrade.localPlayerId && data.fromPlayerId !== activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== activeTrade.localPlayerId && data.toPlayerId !== activeTrade.remotePlayerId) return;
        
        // Update acceptance status
        if (data.fromPlayerId === activeTrade.remotePlayerId) {
            activeTrade.remoteAccepted = data.accepted;
            
            // Update the UI
            updateTradeStatus();
            
            // Check if both players have accepted
            if (activeTrade.localAccepted && activeTrade.remoteAccepted) {
                // Complete the trade
                completeTrade();
            }
        }
    });
    
    // Listen for trade cancellation
    socket.on('trade cancel', (data) => {
        console.log('Received trade cancellation:', data);
        
        // Make sure this update is for our active trade
        if (!activeTrade) return;
        if (data.fromPlayerId !== activeTrade.localPlayerId && data.fromPlayerId !== activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== activeTrade.localPlayerId && data.toPlayerId !== activeTrade.remotePlayerId) return;
        
        // Close the trade window
        closeTradeWindow();
        
        // Show notification
        showNotification('Trade cancelled');
    });
    
    // Listen for trade completion
    socket.on('trade complete', (data) => {
        console.log('Received trade completion:', data);
        
        // Make sure this update is for our active trade
        if (!activeTrade) return;
        if (data.fromPlayerId !== activeTrade.localPlayerId && data.fromPlayerId !== activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== activeTrade.localPlayerId && data.toPlayerId !== activeTrade.remotePlayerId) return;
        
        // Close the trade window
        closeTradeWindow();
        
        // Show notification
        showNotification('Trade completed successfully');
    });
}

/**
 * Set up click handlers for inventory items during trade
 */
function setupInventoryItemClickHandlers() {
    console.log('Setting up inventory item click handlers for trade');
    
    // Find all inventory slots in the game UI
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    console.log(`Found ${inventorySlots.length} inventory slots`);
    
    if (inventorySlots.length === 0) {
        console.warn('No inventory slots found! Make sure inventory is visible');
        // Try again after a short delay to ensure inventory is loaded
        setTimeout(() => {
            const retrySlots = document.querySelectorAll('.inventory-slot');
            console.log(`Retry: Found ${retrySlots.length} inventory slots`);
            
            retrySlots.forEach(slot => {
                slot.removeEventListener('click', handleInventoryItemClick);
                slot.addEventListener('click', handleInventoryItemClick);
                // Add a visual indicator that the slot is clickable for trading
                slot.classList.add('trade-enabled');
                // Add a simple style to highlight trade-enabled slots
                if (!document.getElementById('trade-slot-styles')) {
                    const style = document.createElement('style');
                    style.id = 'trade-slot-styles';
                    style.textContent = '.trade-enabled { box-shadow: 0 0 3px 1px rgba(46, 204, 113, 0.5); }';
                    document.head.appendChild(style);
                }
            });
        }, 500);
    }
    
    inventorySlots.forEach((slot, index) => {
        console.log(`Setting up click handler for slot ${index}`);
        // Remove any existing click handler first to prevent duplicates
        slot.removeEventListener('click', handleInventoryItemClick);
        // Add new click handler
        slot.addEventListener('click', handleInventoryItemClick);
        // Add a visual indicator that the slot is clickable for trading
        slot.classList.add('trade-enabled');
        // Add a simple style to highlight trade-enabled slots
        if (!document.getElementById('trade-slot-styles')) {
            const style = document.createElement('style');
            style.id = 'trade-slot-styles';
            style.textContent = '.trade-enabled { box-shadow: 0 0 3px 1px rgba(46, 204, 113, 0.5); }';
            document.head.appendChild(style);
        }
    });
}

/**
 * Handle clicks on inventory items during trade
 * @param {MouseEvent} event - The click event
 */
function handleInventoryItemClick(event) {
    // Only process if trade window is active
    if (!activeTrade) {
        console.log('No active trade, ignoring inventory click');
        return;
    }
    
    const slot = event.currentTarget;
    const slotIndex = parseInt(slot.dataset.slotIndex);
    console.log('Inventory slot clicked:', slotIndex);
    
    // Find local player entity to get inventory
    // Try different ways to access the world
    let world = window.gameWorld;
    if (!world) {
        console.log('Trying to find world through window.world');
        world = window.world;
    }
    
    if (!world) {
        console.error('Cannot access game world, trying direct inventory access');
        // Try to access inventory items directly from the slot
        const itemElement = slot.querySelector('.inventory-item');
        if (itemElement) {
            // Extract basic item info from the element
            const itemName = itemElement.getAttribute('data-name') || 'Unknown Item';
            const itemId = parseInt(itemElement.getAttribute('data-id') || '0');
            const itemDesc = itemElement.getAttribute('data-description') || '';
            
            const mockItem = {
                id: itemId,
                name: itemName,
                description: itemDesc
            };
            
            // Check if this item is already offered
            const alreadyOffered = activeTrade.localItems.some(offeredItem => 
                offeredItem.inventoryIndex === slotIndex
            );
            
            if (alreadyOffered) {
                // Find the index of the offered item
                const offeredIndex = activeTrade.localItems.findIndex(offeredItem => 
                    offeredItem.inventoryIndex === slotIndex
                );
                
                // Remove from offered items
                removeOfferedItem(offeredIndex);
                
                // Show item back in inventory
                showItemInInventory(slotIndex);
            } else {
                // Add to offered items
                offerItem(slotIndex, mockItem);
                
                // Hide item from inventory
                hideItemInInventory(slotIndex);
            }
            return;
        } else {
            console.error('No item found in this slot');
            return;
        }
    }
    
    const localPlayerEntity = world.entities.find(entity => 
        entity.active && 
        entity.hasComponent('PlayerComponent') && 
        entity.getComponent('PlayerComponent').isLocalPlayer
    );
    
    if (!localPlayerEntity) {
        console.error('Local player entity not found');
        return;
    }
    
    // Get the item from the inventory
    const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
    if (!inventoryComponent) {
        console.error('Inventory component not found on player');
        return;
    }
    
    const item = inventoryComponent.slots[slotIndex];
    
    // If slot is empty, do nothing
    if (!item) {
        console.log('Empty slot clicked');
        return;
    }
    
    console.log('Found item in inventory:', item);
    
    // Check if this item is already offered
    const alreadyOffered = activeTrade.localItems.some(offeredItem => 
        offeredItem.inventoryIndex === slotIndex
    );
    
    if (alreadyOffered) {
        console.log('Item already offered, removing from trade');
        // Find the index of the offered item
        const offeredIndex = activeTrade.localItems.findIndex(offeredItem => 
            offeredItem.inventoryIndex === slotIndex
        );
        
        // Remove from offered items
        removeOfferedItem(offeredIndex);
        
        // Show item back in inventory
        showItemInInventory(slotIndex);
    } else {
        console.log('Adding item to trade offer');
        // Add to offered items
        offerItem(slotIndex, item);
        
        // Hide item from inventory
        hideItemInInventory(slotIndex);
    }
}

/**
 * Hide an item in the inventory (visually) when it's added to trade
 * @param {number} slotIndex - Index of the slot in inventory
 */
function hideItemInInventory(slotIndex) {
    const slot = document.querySelector(`.inventory-slot[data-slot-index="${slotIndex}"]`);
    if (!slot) return;
    
    // Find the item display within the slot
    const itemDisplay = slot.querySelector('.inventory-item');
    if (itemDisplay) {
        // Add a 'traded' class and reduce opacity
        itemDisplay.classList.add('traded');
        itemDisplay.style.opacity = '0.3';
    }
}

/**
 * Show an item back in the inventory when removed from trade
 * @param {number} slotIndex - Index of the slot in inventory
 */
function showItemInInventory(slotIndex) {
    const slot = document.querySelector(`.inventory-slot[data-slot-index="${slotIndex}"]`);
    if (!slot) return;
    
    // Find the item display within the slot
    const itemDisplay = slot.querySelector('.inventory-item');
    if (itemDisplay) {
        // Remove 'traded' class and restore opacity
        itemDisplay.classList.remove('traded');
        itemDisplay.style.opacity = '1';
    }
}

/**
 * Set up right-click context menu for inventory items
 */
function setupInventoryContextMenu() {
    // Find all inventory slots in the game UI (not in the trade window)
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    
    inventorySlots.forEach(slot => {
        // Add contextmenu event listener to each slot
        slot.addEventListener('contextmenu', handleInventoryContextMenu);
    });
}

/**
 * Remove context menu event listeners when trade is closed
 */
function removeInventoryContextMenu() {
    // Find all inventory slots
    const inventorySlots = document.querySelectorAll('.inventory-slot');
    
    // Remove both click and context menu event listeners
    inventorySlots.forEach(slot => {
        // Remove the contextmenu event listener
        slot.removeEventListener('contextmenu', handleInventoryContextMenu);
        // Also remove the click handler
        slot.removeEventListener('click', handleInventoryItemClick);
        
        // Reset any visual changes from trading
        const itemDisplay = slot.querySelector('.inventory-item');
        if (itemDisplay && itemDisplay.classList.contains('traded')) {
            itemDisplay.classList.remove('traded');
            itemDisplay.style.opacity = '1';
        }
    });
    
    // Remove any existing context menus
    const existingMenu = document.getElementById('inventory-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

/**
 * Handle right-click context menu on inventory items
 * @param {MouseEvent} event - The context menu event
 */
function handleInventoryContextMenu(event) {
    event.preventDefault();
    
    // Check if we're in an active trade
    if (!activeTrade || activeTrade.status !== 'active') return;
    
    // Get the slot index from the element's dataset
    const slotIndex = parseInt(event.currentTarget.dataset.slotIndex);
    if (isNaN(slotIndex)) return;
    
    // Find local player entity to get inventory
    const world = window.gameWorld;
    if (!world) return;
    
    const localPlayerEntity = world.entities.find(entity => 
        entity.active && 
        entity.hasComponent('PlayerComponent') && 
        entity.getComponent('PlayerComponent').isLocalPlayer
    );
    
    if (!localPlayerEntity || !localPlayerEntity.hasComponent('InventoryComponent')) return;
    
    const inventoryComponent = localPlayerEntity.getComponent('InventoryComponent');
    const item = inventoryComponent.slots[slotIndex];
    
    // If there's no item in this slot, don't show the menu
    if (!item) return;
    
    // Remove any existing context menu
    const existingMenu = document.getElementById('inventory-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'inventory-context-menu';
    Object.assign(contextMenu.style, {
        position: 'fixed',
        top: `${event.clientY}px`,
        left: `${event.clientX}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        padding: '5px',
        zIndex: '3000',
        color: 'white',
        fontSize: '14px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
    });
    
    // Create menu item for adding to trade
    const addToTradeOption = document.createElement('div');
    addToTradeOption.textContent = 'Add to Trade';
    Object.assign(addToTradeOption.style, {
        padding: '5px 10px',
        cursor: 'pointer',
        borderRadius: '2px'
    });
    
    // Highlight on hover
    addToTradeOption.addEventListener('mouseover', () => {
        addToTradeOption.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });
    addToTradeOption.addEventListener('mouseout', () => {
        addToTradeOption.style.backgroundColor = 'transparent';
    });
    
    // Add click handler to offer the item
    addToTradeOption.addEventListener('click', () => {
        offerItem(slotIndex, item);
        contextMenu.remove();
    });
    
    contextMenu.appendChild(addToTradeOption);
    document.body.appendChild(contextMenu);
    
    // Close menu when clicking elsewhere
    const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeContextMenu);
        }
    };
    
    // Add a small delay before adding the click listener to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 10);
}

/**
 * Show a notification message
 * @param {string} message - The message to show
 */
function showNotification(message) {
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

