/**
 * Trade Requests Module
 * 
 * Handles sending, receiving, and responding to trade requests between players
 */

import { showNotification } from './utils.js';
import { showTradeWindow } from './tradeWindow.js';

// Keep track of pending trade requests
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
    if (window.activeTrade) {
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
