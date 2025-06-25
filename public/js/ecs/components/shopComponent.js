// ShopComponent.js
// Component for shop entities where players can buy and sell items

export class ShopComponent {
    constructor(config = {}) {
        this.shopId = config.shopId || 'general_shop';
        this.name = config.name || 'General Shop';
        this.description = config.description || 'Buy and sell items';
        this.inventoryItems = config.inventoryItems || [];
        this.buysItems = config.buysItems || true; // Whether shop buys items from players
        this.sellPriceModifier = config.sellPriceModifier || 0.5; // Players sell at 50% of value by default
        this.buyPriceModifier = config.buyPriceModifier || 1.0; // Players buy at 100% of value by default
        
        // Categories of items this shop specializes in (e.g., 'mining', 'woodcutting', 'combat')
        // Items in these categories might have better prices
        this.specializations = config.specializations || [];
        
        // Items the shop won't buy
        this.exclusions = config.exclusions || [];
    }

    serialize() {
        return {
            shopId: this.shopId,
            name: this.name,
            description: this.description,
            buysItems: this.buysItems,
            sellPriceModifier: this.sellPriceModifier,
            buyPriceModifier: this.buyPriceModifier,
            specializations: this.specializations,
            exclusions: this.exclusions
        };
    }

    static deserialize(data) {
        return new ShopComponent(data);
    }
}
