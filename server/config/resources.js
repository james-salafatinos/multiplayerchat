// Resource types configuration
// Defines properties for each type of harvestable resource in the game

export default {
    // Rock resources
    'stone_rock': {
        type: 'rock',
        name: 'Stone Rock',
        model: 'models/rocks/rock_small.glb',
        harvestTime: 3000, // ms
        respawnTime: 10000, // ms
        yieldItemId: 'stone',
        yieldAmount: { min: 1, max: 3 },
        requiredLevel: 1, // Mining level required
        xp: 5 // XP granted for mining
    },
    'copper_rock': {
        type: 'rock',
        name: 'Copper Rock',
        model: 'models/rocks/rock_copper.glb',
        harvestTime: 4000,
        respawnTime: 15000,
        yieldItemId: 'copper_ore',
        yieldAmount: { min: 1, max: 2 },
        requiredLevel: 5,
        xp: 10
    },
    'iron_rock': {
        type: 'rock',
        name: 'Iron Rock',
        model: 'models/rocks/rock_iron.glb',
        harvestTime: 5000,
        respawnTime: 20000,
        yieldItemId: 'iron_ore',
        yieldAmount: { min: 1, max: 1 },
        requiredLevel: 10,
        xp: 20
    },
    
    // Tree resources
    'normal_tree': {
        type: 'tree',
        name: 'Tree',
        model: 'models/trees/tree_small.glb',
        harvestTime: 4000,
        respawnTime: 30000,
        yieldItemId: 'wood_logs',
        yieldAmount: { min: 1, max: 3 },
        requiredLevel: 1, // Woodcutting level required
        xp: 10
    },
    'oak_tree': {
        type: 'tree',
        name: 'Oak Tree',
        model: 'models/trees/tree_oak.glb',
        harvestTime: 6000,
        respawnTime: 45000,
        yieldItemId: 'oak_logs',
        yieldAmount: { min: 1, max: 2 },
        requiredLevel: 10,
        xp: 25
    }
};
