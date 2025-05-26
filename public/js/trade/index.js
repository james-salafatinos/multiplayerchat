/**
 * Trade System - Main Entry Point
 * 
 * This file exports all trade system functionality from the various modules.
 */

// Import all modules
import { requestTrade, handleTradeRequest, handleTradeRequestResponse } from './tradeRequests.js';
import { showTradeWindow, closeTradeWindow } from './tradeWindow.js';

// Export all public functions
export {
    // Trade request functions
    requestTrade,
    handleTradeRequest,
    handleTradeRequestResponse,
    
    // Trade window functions
    showTradeWindow,
    closeTradeWindow
};
