// ECS Components
// Components are pure data containers for entities

import { Component } from '../core/index.js';

// ChatBubble Component
// Stores chat message data for display above entities

export class ChatBubbleComponent extends Component {
    constructor(data = {}) {
        super({
            message: data.message || '', // The chat message content
            username: data.username || '', // Username of the sender
            timestamp: data.timestamp || Date.now(), // When the message was sent
            duration: data.duration || 2, // Duration to display in seconds
            timeRemaining: data.duration || 2, // Time remaining to display
            isVisible: data.isVisible || false, // Whether the bubble is currently visible
            element: null // Will hold the DOM element for the chat bubble
        });
    }
}
