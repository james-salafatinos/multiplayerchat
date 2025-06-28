// ShopSystem.js
// System for managing shop entities and handling player shop interactions

import { System } from '../core/system.js';
import { TransformComponent, ShopComponent, InteractableComponent } from '../components/index.js';
import { getContextMenuManager } from '../../contextMenu.js';
import { getSocket } from '../../network.js';
import { showNotification } from '../../utils/notifications.js';
import gameLogger from '../../utils/gameLogger.js';

export class ShopSystem extends System {
    constructor(world) {
        super();
        this.world = world;
        this.socket = getSocket();
        
        // Track the currently open shop
        this.currentShopEntity = null;
        this.currentShopUI = null;
        this.shopInventory = [];
        
        this.setupSocketListeners();
    }
    
    init() {
        // Setup context menu integration
        const contextMenuManager = getContextMenuManager();
        
        // Add shop context menu handlers
        contextMenuManager.registerContextType('shop', (entity) => {
            return [{
                label: 'Trade',
                callback: () => this.openShop(entity)
            }];
        });
    }
    
    setupSocketListeners() {
        // Listen for shop data from server
        this.socket.on('shop-inventory-update', (data) => {
            if (this.currentShopEntity && this.currentShopEntity.id === data.shopId) {
                this.updateShopInventory(data.inventory);
            }
        });
        
        // Listen for transaction results
        this.socket.on('shop-transaction-result', (data) => {
            if (data.success) {
                showNotification(`Transaction successful: ${data.message}`);
                
                // Log successful transaction
                gameLogger.log('Trade', `${data.message}`);
                
                // Update player's gold display
                if (data.newGoldAmount !== undefined) {
                    document.dispatchEvent(new CustomEvent('player-gold-changed', {
                        detail: { gold: data.newGoldAmount }
                    }));
                    
                    // Log gold update
                    if (data.originalGoldAmount !== undefined) {
                        const goldDifference = data.newGoldAmount - data.originalGoldAmount;
                        if (goldDifference > 0) {
                            gameLogger.log('Currency', `Received ${goldDifference} gold`);
                        } else if (goldDifference < 0) {
                            gameLogger.log('Currency', `Spent ${Math.abs(goldDifference)} gold`);
                        }
                    }
                }
            } else {
                showNotification(`Transaction failed: ${data.message}`, 'error');
                
                // Log failed transaction
                gameLogger.log('Trade', `Transaction failed: ${data.message}`, 'error');
            }
        });
    }
    
    update(world, deltaTime) {
        // Get all shop entities with required components
        const shopEntityIds = world.queryEntities([
            ShopComponent, TransformComponent, InteractableComponent
        ]);
        
        for (const entityId of shopEntityIds) {
            const entity = world.getEntityById(entityId);
            if (!entity) continue;
            
            const interactable = entity.getComponent(InteractableComponent);
            
            // If not already set up for interaction
            if (!interactable.contextType) {
                // Set the context menu type for shops
                interactable.contextType = 'shop';
                interactable.interactionDistance = 5; // Distance from which players can interact with shops
            }
        }
        
        // If shop UI is open, update it (prices, etc.)
        if (this.currentShopUI) {
            this.updateShopUI();
        }
    }
    
    openShop(entity) {
        const shopComponent = entity.getComponent(ShopComponent);
        if (!shopComponent) return;
        
        // Store the currently open shop entity
        this.currentShopEntity = entity;
        
        // Log shop interaction
        gameLogger.log('Trade', `Opened shop: ${shopComponent.name}`);
        
        // Request shop inventory from server
        this.socket.emit('request-shop-inventory', {
            shopId: shopComponent.shopId
        });
        
        // Create or show the shop UI
        this.createShopUI(shopComponent);
    }
    
    closeShop() {
        if (this.currentShopUI) {
            // Remove the shop UI from DOM
            document.body.removeChild(this.currentShopUI);
            this.currentShopUI = null;
        }
        
        this.currentShopEntity = null;
    }
    
    createShopUI(shopComponent) {
        // Remove existing UI if any
        if (this.currentShopUI) {
            document.body.removeChild(this.currentShopUI);
        }
        
        // Create new shop UI container
        const shopUI = document.createElement('div');
        shopUI.className = 'shop-window';
        shopUI.innerHTML = `
            <div class="shop-header">
                <h2>${shopComponent.name}</h2>
                <p>${shopComponent.description}</p>
                <button class="close-button">X</button>
            </div>
            <div class="shop-content">
                <div class="shop-tabs">
                    <button class="tab-button active" data-tab="buy">Buy</button>
                    <button class="tab-button" data-tab="sell">Sell</button>
                </div>
                <div class="tab-content">
                    <div class="tab-pane active" id="buy-pane">
                        <div class="shop-inventory"></div>
                    </div>
                    <div class="tab-pane" id="sell-pane">
                        <div class="player-inventory"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Close button event handler
        const closeButton = shopUI.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.closeShop());
        
        // Tab switching
        const tabButtons = shopUI.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                shopUI.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                shopUI.querySelector(`#${tabId}-pane`).classList.add('active');
            });
        });
        
        // Store reference to UI
        this.currentShopUI = shopUI;
        
        // Add to DOM
        document.body.appendChild(shopUI);
        
        // Initialize empty shop inventory
        this.shopInventory = [];
        this.updateShopUI();
    }
    
    updateShopInventory(inventory) {
        this.shopInventory = inventory;
        this.updateShopUI();
    }
    
    updateShopUI() {
        if (!this.currentShopUI) return;
        
        // Get shop and player inventory containers
        const shopInventoryContainer = this.currentShopUI.querySelector('.shop-inventory');
        const playerInventoryContainer = this.currentShopUI.querySelector('.player-inventory');
        
        // Clear existing content
        shopInventoryContainer.innerHTML = '';
        playerInventoryContainer.innerHTML = '';
        
        // Populate shop inventory (buy tab)
        this.shopInventory.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            itemElement.innerHTML = `
                <img src="${item.inventoryIconPath}" alt="${item.name}">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <p class="item-price">${item.price} gold</p>
                </div>
                <button class="buy-button" data-item-id="${item.id}">Buy</button>
            `;
            
            // Add buy button handler
            const buyButton = itemElement.querySelector('.buy-button');
            buyButton.addEventListener('click', () => this.buyItem(item.id));
            
            shopInventoryContainer.appendChild(itemElement);
        });
        
        // Request player inventory from server if not already done
        this.socket.emit('request-player-inventory');
        
        // Populate player inventory (sell tab) - will be updated when we receive inventory from server
        // This will be handled by the InventorySystem that already listens for 'player-inventory-update'
        // We just need to hook into that event
        document.addEventListener('player-inventory-update', (event) => {
            const inventory = event.detail.inventory;
            
            // Clear existing items
            playerInventoryContainer.innerHTML = '';
            
            // Populate sell tab with player inventory
            inventory.forEach((slot, index) => {
                if (!slot || !slot.id) return; // Skip empty slots
                
                const itemElement = document.createElement('div');
                itemElement.className = 'player-item';
                itemElement.innerHTML = `
                    <img src="${slot.inventoryIconPath}" alt="${slot.name}">
                    <div class="item-info">
                        <h3>${slot.name}</h3>
                        <p>Quantity: ${slot.quantity}</p>
                        <p class="item-price">${this.calculateSellPrice(slot)} gold</p>
                    </div>
                    <button class="sell-button" data-slot-index="${index}">Sell</button>
                    <button class="sell-all-button" data-slot-index="${index}">Sell All</button>
                `;
                
                // Add sell button handlers
                const sellButton = itemElement.querySelector('.sell-button');
                sellButton.addEventListener('click', () => this.sellItem(index, 1));
                
                const sellAllButton = itemElement.querySelector('.sell-all-button');
                sellAllButton.addEventListener('click', () => this.sellItem(index, slot.quantity));
                
                playerInventoryContainer.appendChild(itemElement);
            });
        }, { once: true }); // Remove after first invocation
    }
    
    calculateSellPrice(item) {
        // Base price calculation
        const basePrice = item.value || 1;
        
        // Apply shop's sell modifier (if we have a current shop)
        let modifier = 0.5; // Default 50% of value
        if (this.currentShopEntity) {
            const shopComponent = this.currentShopEntity.getComponent(ShopComponent);
            modifier = shopComponent.sellPriceModifier;
            
            // Check if this item is in a specialization category
            // In a real game, we would add a tag system or item categories
            // For simplicity, we'll check by item ID patterns
            if (item.id.includes('ore') && shopComponent.specializations.includes('mining')) {
                modifier += 0.2; // Better prices for mining products at a mining shop
            }
            
            if (item.id.includes('log') && shopComponent.specializations.includes('woodcutting')) {
                modifier += 0.2; // Better prices for woodcutting products at a lumber shop
            }
        }
        
        return Math.floor(basePrice * modifier);
    }
    
    buyItem(itemId) {
        if (!this.currentShopEntity) return;
        
        const shopComponent = this.currentShopEntity.getComponent(ShopComponent);
        
        // Find the item details from the shop inventory
        const item = this.shopInventory.find(item => item.id === itemId);
        if (item) {
            // Log purchase attempt
            if (gameLogger.socket && gameLogger.localPlayerId) {
                gameLogger.log(
                    'Trade',
                    `Attempting to buy ${item.name} for ${item.price} gold from ${shopComponent.name}`
                );
            }
        }
        
        this.socket.emit('shop-buy-item', {
            shopId: shopComponent.shopId,
            itemId: itemId,
            quantity: 1
        });
    }
    
    sellItem(slotIndex, quantity) {
        if (!this.currentShopEntity) return;
        
        const shopComponent = this.currentShopEntity.getComponent(ShopComponent);
        
        // Get player inventory to find item details
        // This is an approximation as we might not have the most up-to-date inventory
        // A better approach would be to use a cached copy of the player's inventory
        const playerInventory = document.querySelector('.player-inventory');
        if (playerInventory) {
            const item = document.querySelector(`.player-item [data-slot-index="${slotIndex}"]`);
            if (item) {
                const itemName = item.querySelector('h3')?.textContent;
                const price = parseFloat(item.querySelector('.item-price')?.textContent) || 0;
                
                // Log sell attempt
                if (gameLogger.socket && gameLogger.localPlayerId) {
                    gameLogger.log(
                        'Trade',
                        `Attempting to sell ${quantity}x ${itemName || 'Unknown Item'} for ${price * quantity} gold to ${shopComponent.name}`
                    );
                }
            }
        }
        
        this.socket.emit('shop-sell-item', {
            shopId: shopComponent.shopId,
            slotIndex: slotIndex,
            quantity: quantity
        });
    }
}
