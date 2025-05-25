// Import required modules
import { getLocalPlayerId } from './network.js';

// Chat functionality
const messageContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const usernameInput = { value: '' }; // Placeholder for compatibility

// Store chat messages locally
let chatHistory = [];

// Track authenticated username
let authenticatedUsername = '';
let localPlayerId = null; // Will be set when the player is authenticated

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
 * Add a message to the chat display
 * @param {Object} message - The message object
 */
function addMessageToChat(message) {
    // Add to chat history if it's a regular message
    if (!message.type) {
        chatHistory.push(message);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    
    if (message.type === 'system') {
        // System message
        messageElement.classList.add('system-message');
        messageElement.textContent = message.content;
    } else {
        // User message
        messageElement.classList.add('message');
        
        // Format timestamp
        const timestamp = message.timestamp 
            ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-info">
                <span class="username">${message.username}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
    }
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

/**
 * Render the chat history
 */
function renderChatHistory() {
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Render each message
    chatHistory.forEach(message => {
        addMessageToChat(message);
    });
}
