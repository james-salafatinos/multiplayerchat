/**
 * Trade Events Module
 * 
 * Handles socket event listeners for trade functionality
 */

import { updateOfferedItems } from './tradeItems.js';
import { updateTradeStatus, completeTrade, closeTradeWindow } from './tradeWindow.js';
import { showNotification } from './utils.js';

/**
 * Set up socket event listeners for trade events
 */
export function setupTradeEventListeners() {
    if (!window.activeTrade || !window.activeTrade.socket) return;
    
    const socket = window.activeTrade.socket;
    
    // Handle trade request response
    socket.on('trade request response', (data) => {
        if (data.accepted) {
            // Trade request was accepted, nothing to do as window is already open
            console.log(`Trade request accepted by ${window.activeTrade.remotePlayerName}`);
        } else {
            // Trade request was declined
            console.log(`Trade request declined by ${window.activeTrade.remotePlayerName}`);
            showNotification(`${window.activeTrade.remotePlayerName} declined your trade request.`);
            closeTradeWindow();
        }
    });
    
    // Listen for trade updates
    socket.on('trade update', (data) => {
        console.log('Received trade update:', data);
        
        // Make sure this update is for our active trade
        if (!window.activeTrade) return;
        if (data.fromPlayerId !== window.activeTrade.localPlayerId && data.fromPlayerId !== window.activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== window.activeTrade.localPlayerId && data.toPlayerId !== window.activeTrade.remotePlayerId) return;
        
        // Update the offered items
        if (data.fromPlayerId === window.activeTrade.remotePlayerId) {
            window.activeTrade.remoteItems = data.offeredItems;
            window.activeTrade.localAccepted = false;
            window.activeTrade.remoteAccepted = false;
            
            // Update the UI
            updateOfferedItems();
            updateTradeStatus();
        }
    });
    
    // Listen for trade acceptance
    socket.on('trade accept', (data) => {
        console.log('Received trade acceptance:', data);
        
        // Make sure this update is for our active trade
        if (!window.activeTrade) return;
        if (data.fromPlayerId !== window.activeTrade.localPlayerId && data.fromPlayerId !== window.activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== window.activeTrade.localPlayerId && data.toPlayerId !== window.activeTrade.remotePlayerId) return;
        
        // Update acceptance status
        if (data.fromPlayerId === window.activeTrade.remotePlayerId) {
            window.activeTrade.remoteAccepted = data.accepted;
            
            // Update the UI
            updateTradeStatus();
            
            // Check if both players have accepted
            if (window.activeTrade.localAccepted && window.activeTrade.remoteAccepted) {
                // Complete the trade
                completeTrade();
            }
        }
    });
    
    // Listen for trade cancellation
    socket.on('trade cancel', (data) => {
        console.log('Received trade cancellation:', data);
        
        // Make sure this update is for our active trade
        if (!window.activeTrade) return;
        if (data.fromPlayerId !== window.activeTrade.localPlayerId && data.fromPlayerId !== window.activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== window.activeTrade.localPlayerId && data.toPlayerId !== window.activeTrade.remotePlayerId) return;
        
        // Close the trade window
        closeTradeWindow();
        
        // Show notification
        showNotification('Trade cancelled');
    });
    
    // Listen for trade completion
    socket.on('trade complete', (data) => {
        console.log('Received trade completion:', data);
        
        // Make sure this update is for our active trade
        if (!window.activeTrade) return;
        if (data.fromPlayerId !== window.activeTrade.localPlayerId && data.fromPlayerId !== window.activeTrade.remotePlayerId) return;
        if (data.toPlayerId !== window.activeTrade.localPlayerId && data.toPlayerId !== window.activeTrade.remotePlayerId) return;
        
        // Close the trade window
        closeTradeWindow();
        
        // Show notification
        showNotification('Trade completed successfully');
    });
}
