// Import required modules
import { getLocalPlayerId } from './network.js';

// Chat functionality
const messageContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const usernameInput = { value: '' }; // Placeholder for compatibility

// Chat filter tabs
const filterTabs = document.querySelectorAll('.chat-filter-tab');

// Store chat messages locally
let chatHistory = [];
let gameActionHistory = [];

// Track authenticated username
let authenticatedUsername = '';
let localPlayerId = null; // Will be set when the player is authenticated

// Current filter mode
let currentFilterMode = 'all'; // 'all', 'public', or 'game'

/**
 * Initialize the chat system
 * @param {Object} socket - The Socket.io instance
 */
export function initChat(socket) {
    // Listen for authentication event to get the username
    document.addEventListener('player-authenticated', (event) => {
        authenticatedUsername = event.detail.username;
        localPlayerId = getLocalPlayerId();
        console.log('Chat system authenticated as:', authenticatedUsername, 'with player ID:', localPlayerId);
        
        // Enable chat input now that we have a username
        chatInput.disabled = false;
        chatInput.focus();
        
        // Add welcome message
        addMessageToChat({
            type: 'system',
            content: `Welcome, ${authenticatedUsername}! Type a message to start chatting.`,
            timestamp: new Date().toISOString()
        });
    });
    
    // Initialize chat filter tab functionality
    initChatFilterTabs();
    
    // Send message on button click
    sendButton.addEventListener('click', () => {
        sendMessage(socket);
    });
    
    // Send message on Enter key (without Shift)
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(socket);
        }
    });
    
    // Allow Shift+Enter for new lines
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            // Allow default behavior (new line)
            return true;
        }
    });
    
    // Auto-resize textarea based on content
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        validateMessage();
    });
    
    // Handle received chat messages
    socket.on('chat message', (message) => {
        addMessageToChat(message);
        
        // Dispatch event for chat bubble system if message has playerId
        if (message.playerId) {
            console.log('Dispatching player-chat-message event:', message);
            document.dispatchEvent(new CustomEvent('player-chat-message', { 
                detail: message 
            }));
        } else {
            console.warn('Chat message missing playerId, cannot create chat bubble:', message);
        }
    });
    
    // Handle game action messages
    socket.on('game action', (action) => {
        addGameActionToChat(action);
    });
    
    // Handle chat history from server
    socket.on('chat history', (messages) => {
        chatHistory = messages;
        renderChatHistory();
        
        // Show system message
        const systemMessage = {
            type: 'system',
            content: 'Connected to chat. Welcome!'
        };
        addMessageToChat(systemMessage);
    });
    
    // Handle game action history from server
    socket.on('game action history', (actions) => {
        gameActionHistory = actions;
        if (currentFilterMode === 'all' || currentFilterMode === 'game') {
            renderGameActions();
        }
    });
}

/**
 * Validate the chat message input
 */
function validateMessage() {
    const hasMessage = chatInput.value.trim().length > 0;
    // Update send button state
    sendButton.disabled = !hasMessage || !authenticatedUsername;
}

/**
 * Send a chat message
 * @param {Object} socket - The Socket.io instance
 */
function sendMessage(socket) {
    const content = chatInput.value.trim();
    
    if (authenticatedUsername && content) {
        // Send message to server
        socket.emit('chat message', { 
            username: authenticatedUsername, 
            content: content,
            playerId: localPlayerId // Include player ID for chat bubbles
        });
        
        // Clear input field
        chatInput.value = '';
        sendButton.disabled = true;
        
        // Focus back on input
        chatInput.focus();
    }
}

/**
 * Initialize chat filter tab functionality
 */
function initChatFilterTabs() {
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Set current filter mode
            currentFilterMode = tab.dataset.filter;
            
            // Re-render messages based on filter
            updateChatDisplay();
        });
    });
}

/**
 * Update the chat display based on current filter
 */
function updateChatDisplay() {
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Show messages based on current filter
    if (currentFilterMode === 'all' || currentFilterMode === 'public') {
        // Render regular chat messages
        chatHistory.forEach(message => {
            addMessageElementToChat(message, false);
        });
    }
    
    if (currentFilterMode === 'all' || currentFilterMode === 'game') {
        // Render game action messages
        gameActionHistory.forEach(action => {
            addMessageElementToChat(action, true);
        });
    }
    
    // Sort all messages by timestamp
    sortChatMessagesByTimestamp();
    
    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

/**
 * Sort chat messages by timestamp
 */
function sortChatMessagesByTimestamp() {
    // Get all message elements
    const messageElements = Array.from(messageContainer.children);
    
    // Sort by timestamp data attribute
    messageElements.sort((a, b) => {
        const timeA = new Date(a.dataset.timestamp || 0);
        const timeB = new Date(b.dataset.timestamp || 0);
        return timeA - timeB;
    });
    
    // Clear container
    messageContainer.innerHTML = '';
    
    // Re-append in sorted order
    messageElements.forEach(element => {
        messageContainer.appendChild(element);
    });
}

/**
 * Add a message to the chat display
 * @param {Object} message - The message object
 */
function addMessageToChat(message) {
    // Add to chat history if it's a regular message
    if (!message.type) {
        chatHistory.push(message);
    }
    
    // Only add to display if it matches current filter
    if (currentFilterMode === 'all' || currentFilterMode === 'public') {
        addMessageElementToChat(message, false);
        
        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}

/**
 * Add a game action to the chat
 * @param {Object} action - The game action object
 */
function addGameActionToChat(action) {
    // Add to game action history
    gameActionHistory.push(action);
    
    // Only add to display if it matches current filter
    if (currentFilterMode === 'all' || currentFilterMode === 'game') {
        addMessageElementToChat(action, true);
        
        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}

/**
 * Add message element to chat container
 * @param {Object} messageObj - The message or action object
 * @param {boolean} isGameAction - Whether this is a game action message
 */
function addMessageElementToChat(messageObj, isGameAction) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.dataset.timestamp = messageObj.timestamp || new Date().toISOString();
    
    if (messageObj.type === 'system') {
        // System message
        messageElement.classList.add('system-message');
        messageElement.textContent = messageObj.content;
    } else if (isGameAction) {
        // Game action message
        messageElement.classList.add('game-action');
        
        // Format timestamp
        const timestamp = messageObj.timestamp 
            ? new Date(messageObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-info">
                ${messageObj.playerName ? `<span class="player-name">${messageObj.playerName}</span>` : ''}
                <span class="game-action-type">${messageObj.actionType || 'Action'}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${messageObj.content}</div>
        `;
    } else {
        // User message
        messageElement.classList.add('message');
        
        // Format timestamp
        const timestamp = messageObj.timestamp 
            ? new Date(messageObj.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-info">
                <span class="username">${messageObj.username}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${messageObj.content}</div>
        `;
    }
    
    // Add to container
    messageContainer.appendChild(messageElement);
}

/**
 * Render the chat history
 */
function renderChatHistory() {
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Only render if current filter includes public messages
    if (currentFilterMode === 'all' || currentFilterMode === 'public') {
        // Render each message
        chatHistory.forEach(message => {
            addMessageElementToChat(message, false);
        });
    }
}

/**
 * Render game actions
 */
function renderGameActions() {
    // Only render if current filter includes game actions
    if (currentFilterMode === 'all' || currentFilterMode === 'game') {
        // Render each action
        gameActionHistory.forEach(action => {
            addMessageElementToChat(action, true);
        });
    }
}
