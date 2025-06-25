// server/socket/shops.js
// Socket handlers for shop interactions

import shopManager from '../game/shopManager.js';
import { statements } from '../db/index.js';

// Initialize shop system
function initShops() {
    shopManager.init();
}

// Set up socket handlers for shop interactions
function initShopHandlers(io, players) {
    console.log('Initializing shop handlers...');
    
    // Register socket handlers for all connected clients
    io.on('connection', (socket) => {
        // Get the player object for this socket
        const player = players.get(socket.id);
    
    // Client requesting shop inventory
    socket.on('request-shop-inventory', async (data) => {
        try {
            const { shopId } = data;
            
            // Get shop inventory from manager
            const shopInventory = shopManager.getShopInventory(shopId);
            
            // Send shop inventory to client
            socket.emit('shop-inventory-update', {
                shopId,
                inventory: shopInventory
            });
        } catch (error) {
            console.error(`[Shop] Error getting shop inventory: ${error.message}`);
            socket.emit('shop-inventory-update', {
                shopId: data.shopId,
                inventory: []
            });
        }
    });
    
    // Client buying an item
    socket.on('shop-buy-item', async (data) => {
        try {
            const { shopId, itemId, quantity } = data;
            const player = players.get(socket.id);
            
            if (!player) {
                socket.emit('shop-transaction-result', { 
                    success: false, 
                    message: 'Player not found' 
                });
                return;
            }
            
            // Process the purchase
            const result = await shopManager.buyItem(player.userId, shopId, itemId, quantity);
            
            // Send result to client
            socket.emit('shop-transaction-result', result);
            
            // If successful, update player's inventory
            if (result.success) {
                // Fetch updated inventory from database
                player.inventory = await statements.getInventory(player.userId);
                
                // Send updated inventory to client
                socket.emit('player inventory', player.inventory);
                
                // Update player's gold UI
                socket.emit('player-gold-update', { gold: result.newGoldAmount });
            }
        } catch (error) {
            console.error(`[Shop] Error processing purchase: ${error.message}`);
            socket.emit('shop-transaction-result', { 
                success: false, 
                message: 'Server error processing purchase' 
            });
        }
    });
    
    // Client selling an item
    socket.on('shop-sell-item', async (data) => {
        try {
            const { shopId, slotIndex, quantity } = data;
            const player = players.get(socket.id);
            
            if (!player) {
                socket.emit('shop-transaction-result', { 
                    success: false, 
                    message: 'Player not found' 
                });
                return;
            }
            
            // Process the sale
            const result = await shopManager.sellItem(player.userId, shopId, slotIndex, quantity);
            
            // Send result to client
            socket.emit('shop-transaction-result', result);
            
            // If successful, update player's inventory
            if (result.success) {
                // Fetch updated inventory from database
                player.inventory = await statements.getInventory(player.userId);
                
                // Send updated inventory to client
                socket.emit('player inventory', player.inventory);
                
                // Update player's gold UI
                socket.emit('player-gold-update', { gold: result.newGoldAmount });
            }
        } catch (error) {
            console.error(`[Shop] Error processing sale: ${error.message}`);
            socket.emit('shop-transaction-result', { 
                success: false, 
                message: 'Server error processing sale' 
            });
        }
    });
    
    // Admin command to spawn a shop
    socket.on('admin-spawn-shop', (data) => {
        try {
            const player = players.get(socket.id);
            
            if (!player || !player.isAdmin) {
                socket.emit('admin-spawn-shop-result', { 
                    success: false, 
                    message: 'Permission denied' 
                });
                return;
            }
            
            const { shopType, position } = data;
            
            // TODO: Implement shop spawning if needed
            // For now, shops are spawned at server start with fixed positions
            
            socket.emit('admin-spawn-shop-result', { 
                success: false, 
                message: 'Dynamic shop spawning not implemented yet' 
            });
        } catch (error) {
            console.error(`[Shop] Error spawning shop: ${error.message}`);
            socket.emit('admin-spawn-shop-result', { 
                success: false, 
                message: 'Server error spawning shop' 
            });
        }
    });
    
    // Send list of all shops to client on connection
    try {
        const allShops = shopManager.getAllShops().map(shop => ({
            id: shop.id,
            name: shop.name,
            position: shop.position
        }));
        
        socket.emit('all-shops', allShops);
    } catch (error) {
        console.error(`[Shop] Error sending shop list: ${error.message}`);
    }
    });
    
    console.log('Shop handlers initialized');
}

export { initShops, initShopHandlers };
