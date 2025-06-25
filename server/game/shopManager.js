// Shop Manager for the server
// Handles shop inventory, transactions, and player interactions with shops

import { v4 as uuidv4 } from 'uuid';
import shopConfigs from '../config/shops.js';
import { getItemById } from '../utils/itemManager.js';
import { statements } from '../db/index.js';

class ShopManager {
    constructor() {
        this.shops = new Map(); // shopId -> shop object
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('[ShopManager] Initializing shop manager...');
        
        // Initialize shops from configuration
        Object.entries(shopConfigs).forEach(([shopId, config]) => {
            const shop = {
                id: shopId,
                name: config.name,
                description: config.description,
                position: config.position,
                buysItems: config.buysItems,
                sellPriceModifier: config.sellPriceModifier,
                buyPriceModifier: config.buyPriceModifier,
                specializations: config.specializations,
                exclusions: config.exclusions,
                inventory: this.initializeShopInventory(config.stock)
            };
            
            this.shops.set(shopId, shop);
        });
        
        this.initialized = true;
        console.log(`[ShopManager] Shop manager initialized with ${this.shops.size} shops`);
    }
    
    initializeShopInventory(stock) {
        return stock.map(item => {
            // Get item details from item manager
            const itemDetails = getItemById(item.id);
            if (!itemDetails) {
                console.error(`[ShopManager] Failed to find item details for ${item.id}`);
                return null;
            }
            
            return {
                id: item.id,
                name: itemDetails.name,
                description: itemDetails.description || '',
                price: item.price,
                inventoryIconPath: itemDetails.inventoryIconPath,
                quantity: item.quantity
            };
        }).filter(Boolean); // Remove null items
    }
    
    getShop(shopId) {
        return this.shops.get(shopId);
    }
    
    getShopInventory(shopId) {
        const shop = this.shops.get(shopId);
        if (!shop) return [];
        
        return shop.inventory;
    }
    
    async buyItem(playerId, shopId, itemId, quantity = 1) {
        const shop = this.shops.get(shopId);
        if (!shop) {
            return { success: false, message: 'Shop not found' };
        }
        
        // Find the item in shop inventory
        const shopItem = shop.inventory.find(item => item.id === itemId);
        if (!shopItem) {
            return { success: false, message: 'Item not sold by this shop' };
        }
        
        // Check if shop has enough stock
        if (shopItem.quantity !== -1 && shopItem.quantity < quantity) {
            return { success: false, message: 'Not enough stock available' };
        }
        
        // Calculate total cost
        const totalCost = shopItem.price * quantity;
        
        try {
            // Get player's gold amount from database
            const playerGold = await statements.getPlayerGold(playerId);
            
            // Check if player has enough gold
            if (playerGold < totalCost) {
                return { success: false, message: 'Not enough gold' };
            }
            
            // Deduct gold from player
            await statements.updatePlayerGold(playerId, playerGold - totalCost);
            
            // Add item to player's inventory
            await statements.addItemToInventory(playerId, itemId, quantity);
            
            // Update shop inventory if needed
            if (shopItem.quantity !== -1) {
                shopItem.quantity -= quantity;
            }
            
            // Get player's new gold amount
            const newGoldAmount = await statements.getPlayerGold(playerId);
            
            return { 
                success: true, 
                message: `Bought ${quantity}x ${shopItem.name} for ${totalCost} gold`, 
                newGoldAmount,
                itemId,
                quantity
            };
        } catch (error) {
            console.error(`[ShopManager] Error processing purchase: ${error.message}`);
            return { success: false, message: 'Failed to process purchase' };
        }
    }
    
    async sellItem(playerId, shopId, slotIndex, quantity = 1) {
        const shop = this.shops.get(shopId);
        if (!shop) {
            return { success: false, message: 'Shop not found' };
        }
        
        // Check if shop buys items
        if (!shop.buysItems) {
            return { success: false, message: 'This shop does not buy items' };
        }
        
        try {
            // Get player's inventory
            const inventory = await statements.getInventory(playerId);
            
            // Check that slot is valid and not empty
            if (slotIndex < 0 || slotIndex >= inventory.length || !inventory[slotIndex]) {
                return { success: false, message: 'Invalid inventory slot' };
            }
            
            const slot = inventory[slotIndex];
            
            // Check if player has enough quantity
            if (slot.quantity < quantity) {
                return { success: false, message: 'Not enough items to sell' };
            }
            
            // Check if item is on shop's exclusion list
            if (shop.exclusions.includes(slot.id)) {
                return { success: false, message: 'This shop does not buy this item' };
            }
            
            // Get item details
            const itemDetails = getItemById(slot.id);
            if (!itemDetails) {
                return { success: false, message: 'Invalid item' };
            }
            
            // Calculate sell price
            let sellPrice = this.calculateSellPrice(shop, itemDetails, quantity);
            
            // Remove items from inventory
            await statements.removeItemFromInventory(playerId, slotIndex, quantity);
            
            // Add gold to player
            const currentGold = await statements.getPlayerGold(playerId);
            await statements.updatePlayerGold(playerId, currentGold + sellPrice);
            
            // Get player's new gold amount
            const newGoldAmount = await statements.getPlayerGold(playerId);
            
            return { 
                success: true, 
                message: `Sold ${quantity}x ${itemDetails.name} for ${sellPrice} gold`, 
                newGoldAmount,
                itemId: slot.id,
                quantity
            };
        } catch (error) {
            console.error(`[ShopManager] Error processing sale: ${error.message}`);
            return { success: false, message: 'Failed to process sale' };
        }
    }
    
    calculateSellPrice(shop, itemDetails, quantity) {
        // Base price from item value
        const baseValue = itemDetails.value || 1;
        
        // Apply shop modifier
        let modifier = shop.sellPriceModifier;
        
        // Check if item is in shop's specialization
        if (itemDetails.type === 'resource') {
            const itemCategory = this.getItemCategory(itemDetails.id);
            if (shop.specializations.includes(itemCategory)) {
                modifier += 0.2; // Better prices for specialized items
            }
        }
        
        return Math.floor(baseValue * modifier * quantity);
    }
    
    getItemCategory(itemId) {
        // Simple categorization based on item ID
        if (itemId.includes('ore') || itemId === 'stone') {
            return 'mining';
        } else if (itemId.includes('log')) {
            return 'woodcutting';
        } else if (itemId.includes('potion')) {
            return 'alchemy';
        }
        return 'general';
    }
    
    getAllShops() {
        return Array.from(this.shops.values());
    }
    
    getSerializableShop(shopId) {
        const shop = this.shops.get(shopId);
        if (!shop) return null;
        
        return {
            id: shop.id,
            name: shop.name,
            description: shop.description,
            position: shop.position,
            buysItems: shop.buysItems,
            sellPriceModifier: shop.sellPriceModifier,
            specializations: shop.specializations
        };
    }
}

// Export a singleton instance
const shopManager = new ShopManager();
export default shopManager;
