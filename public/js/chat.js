// Chat functionality
const messageContainer = document.getElementById('chat-messages');
const usernameInput = document.getElementById('username-input');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

// Store chat messages locally
let chatHistory = [];

/**
 * Initialize the chat system
 * @param {Object} socket - The Socket.io instance
 */
export function initChat(socket) {
    // Enable chat input when username is entered
    usernameInput.addEventListener('input', validateInputs);
    
    // Send message on button click
    sendButton.addEventListener('click', () => {
        sendMessage(socket);
    });
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(socket);
        }
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
 * Validate inputs to enable/disable the send button
 */
function validateInputs() {
    const username = usernameInput.value.trim();
    const hasUsername = username.length > 0;
    
    // Enable/disable chat input based on username
    chatInput.disabled = !hasUsername;
    sendButton.disabled = !hasUsername || chatInput.value.trim().length === 0;
    
    // Listen for changes to chat input
    chatInput.addEventListener('input', () => {
        sendButton.disabled = chatInput.value.trim().length === 0 || !hasUsername;
    });
}

/**
 * Send a chat message
 * @param {Object} socket - The Socket.io instance
 */
function sendMessage(socket) {
    const username = usernameInput.value.trim();
    const content = chatInput.value.trim();
    
    if (username && content) {
        // Send message to server
        socket.emit('chat message', { username, content });
        
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
