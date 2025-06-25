// Shop configurations for the game
// Defines properties and stock for each shop type

export default {
    'general_shop': {
        name: 'General Store',
        description: 'Buy and sell general goods',
        position: { x: 5, y: 0, z: 5 },
        buysItems: true,
        sellPriceModifier: 0.5, // Players sell at 50% of value
        buyPriceModifier: 1.0, // Players buy at 100% of value
        specializations: [],
        exclusions: [], // Items this shop won't buy
        stock: [
            {
                id: 'health_potion_small',
                price: 25,
                quantity: -1 // -1 means unlimited stock
            }
        ]
    },
    'mining_shop': {
        name: 'Mining Supplies',
        description: 'Mining equipment and ore exchange',
        position: { x: -15, y: 0, z: 10 },
        buysItems: true,
        sellPriceModifier: 0.7, // Better prices for mining resources (70%)
        buyPriceModifier: 1.0,
        specializations: ['mining'],
        exclusions: ['wood_logs', 'oak_logs'],
        stock: [
            {
                id: 'health_potion_small',
                price: 30, // More expensive here than general store
                quantity: -1
            }
        ]
    },
    'woodcutting_shop': {
        name: 'Lumber Mill',
        description: 'Woodcutting supplies and log trading',
        position: { x: 20, y: 0, z: -10 },
        buysItems: true,
        sellPriceModifier: 0.7, // Better prices for wood resources (70%)
        buyPriceModifier: 1.0,
        specializations: ['woodcutting'],
        exclusions: ['stone', 'copper_ore', 'iron_ore'],
        stock: [
            {
                id: 'health_potion_small',
                price: 30, // More expensive here than general store
                quantity: -1
            }
        ]
    }
};
