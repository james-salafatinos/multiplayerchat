// server/socket/admin.js
// Admin socket handlers for item spawning and management

import { v4 as uuidv4 } from 'uuid';
import { addWorldItem, removeWorldItem } from '../utils/worldItems.js';
import { getItemById, getAllItems } from '../utils/itemManager.js';
import { statements } from '../db/index.js';

/**
 * Initialize admin handlers for a socket connection
 * @param {Object} socket - The socket.io socket object
 * @param {Object} io - The socket.io server instance
 * @param {Map} players - The map of connected players
 * @param {Map} worldItems - The map of world items
 */
// XP to level mapping based on Runescape scaling
const XP_TO_LEVEL = [
    0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833, 2107, 2411, 
    2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 
    12031, 13363, 14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224, 
    41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333, 111945, 
    123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742, 302288, 
    333804, 368599, 407015, 449428, 496254, 547953, 605032, 668051, 737627, 814445, 
    899257, 992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068, 
    2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 
    5346332, 5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606, 13034431
];

/**
 * Calculate level from XP using Runescape scaling
 * @param {number} xp - Experience points
 * @returns {number} - Level (1-99)
 */
function calculateLevel(xp) {
    if (xp <= 0) return 1;
    
    for (let level = 1; level < XP_TO_LEVEL.length; level++) {
        if (xp < XP_TO_LEVEL[level]) {
            return level;
        }
    }
    
    return 99; // Max level
}

/**
 * Get all skills data for a player
 * @param {number} userId - User ID
 * @returns {Object} - Skills data with levels calculated
 */
function getPlayerSkillsData(userId) {
    try {
        // Make sure player has skills entry
        statements.initPlayerSkills.run(userId);
        
        // Get skills data
        const skillsData = statements.getPlayerSkills.get(userId);
        
        if (!skillsData) {
            console.error(`No skills data found for user ${userId}`);
            return {
                strength: { level: 1, xp: 0 },
                hitpoints: { level: 1, xp: 0 },
                mining: { level: 1, xp: 0 },
                magic: { level: 1, xp: 0 }
            };
        }
        
        // Calculate levels from XP
        return {
            strength: { 
                level: calculateLevel(skillsData.strength_xp), 
                xp: skillsData.strength_xp 
            },
            hitpoints: { 
                level: calculateLevel(skillsData.hitpoints_xp), 
                xp: skillsData.hitpoints_xp 
            },
            mining: { 
                level: calculateLevel(skillsData.mining_xp), 
                xp: skillsData.mining_xp 
            },
            magic: { 
                level: calculateLevel(skillsData.magic_xp), 
                xp: skillsData.magic_xp 
            }
        };
    } catch (error) {
        console.error('Error getting player skills:', error);
        return {
            strength: { level: 1, xp: 0 },
            hitpoints: { level: 1, xp: 0 },
            mining: { level: 1, xp: 0 },
            magic: { level: 1, xp: 0 }
        };
    }
}

export function initAdminHandlers(socket, io, players, worldItems) {
  // Check if user has admin privileges
  const isAdmin = () => {
    return socket.userId && (socket.isAdmin === true);
  };

  // Handle admin authentication
  socket.on('admin:auth', (data) => {
    // In a real application, you would verify admin credentials here
    // For now, we'll use a simple password check
    if (data.password === 'admin') {
      socket.isAdmin = true;
      socket.emit('admin:auth:response', { 
        success: true, 
        message: 'Admin authentication successful' 
      });
    } else {
      socket.isAdmin = false;
      socket.emit('admin:auth:response', { 
        success: false, 
        message: 'Admin authentication failed' 
      });
    }
  });

  // Get all available items for spawning
  socket.on('admin:getAvailableItems', () => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    const items = getAllItems();
    socket.emit('admin:availableItems', items);
  });

  // Spawn an item in the world
  socket.on('admin:spawnItem', (data) => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    try {
      const { itemId, position } = data;
      
      // Get item definition
      const itemDef = getItemById(itemId);
      if (!itemDef) {
        socket.emit('admin:error', { message: `Item with ID ${itemId} not found` });
        return;
      }

      // Generate a unique UUID for the item
      const itemUuid = `item-${uuidv4()}`;
      
      // Create the world item
      const worldItem = {
        uuid: itemUuid,
        id: itemDef.id,
        name: itemDef.name,
        description: itemDef.description || '',
        position: position || { x: 0, y: 0.15, z: 0 }, // Default position if none provided
        gltfPath: itemDef.gltfPath // Include the gltfPath
      };
      
      // Add to world items map and database
      const success = addWorldItem(worldItems, worldItem);
      
      if (success) {
        // Notify all clients about the new item
        io.emit('world-item-added', worldItem);
        
        socket.emit('admin:spawnItem:response', { 
          success: true, 
          message: `Item ${itemDef.name} spawned successfully`,
          item: worldItem
        });
      } else {
        socket.emit('admin:error', { message: 'Failed to add item to world' });
      }
    } catch (error) {
      console.error('Error spawning item:', error);
      socket.emit('admin:error', { message: `Error spawning item: ${error.message}` });
    }
  });

  // Get all world items
  socket.on('admin:getWorldItems', () => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    const worldItemsArray = Array.from(worldItems.values());
    socket.emit('admin:worldItems', worldItemsArray);
  });

  // Get online players
  socket.on('admin:getPlayers', () => {
    const onlinePlayers = Array.from(players.values()).map(player => ({
      id: player.id,
      username: player.username,
      userId: player.userId
    }));
    socket.emit('admin:players', onlinePlayers);
  });

  // Award XP to player
  socket.on('admin:awardXp', (data) => {
    try {
      const { username, skill, xp } = data;
      
      // Validate inputs
      if (!username || !skill || !xp) {
        socket.emit('admin:awardXp:response', {
          success: false,
          message: 'Missing required fields'
        });
        return;
      }
      
      // Find target player
      const targetPlayer = Array.from(players.values()).find(p => p.username === username);
      
      if (!targetPlayer || !targetPlayer.userId) {
        socket.emit('admin:awardXp:response', {
          success: false,
          message: `Player ${username} not found or not online`
        });
        return;
      }
      
      // Validate skill
      const validSkills = ['strength', 'hitpoints', 'mining', 'magic'];
      if (!validSkills.includes(skill)) {
        socket.emit('admin:awardXp:response', {
          success: false,
          message: `Invalid skill: ${skill}`
        });
        return;
      }
      
      // Award XP using the skills handler
      // First make sure player has skills entry
      statements.initPlayerSkills.run(targetPlayer.userId);
      
      // Get current skills data to check for level ups
      const beforeSkills = getPlayerSkillsData(targetPlayer.userId);
      
      // Award XP to the appropriate skill
      console.log(`Admin awarding ${xp} ${skill} XP to player ${username}`);
      
      // Use the appropriate prepared statement based on the skill
      if (skill === 'strength') {
        statements.updateStrengthXp.run(xp, targetPlayer.userId);
      } else if (skill === 'hitpoints') {
        statements.updateHitpointsXp.run(xp, targetPlayer.userId);
      } else if (skill === 'mining') {
        statements.updateMiningXp.run(xp, targetPlayer.userId);
      } else if (skill === 'magic') {
        statements.updateMagicXp.run(xp, targetPlayer.userId);
      }
      
      // Get updated skills data
      const afterSkills = getPlayerSkillsData(targetPlayer.userId);
      
      // Check for level ups
      const levelUps = [];
      if (afterSkills[skill].level > beforeSkills[skill].level) {
        levelUps.push({
          skill,
          newLevel: afterSkills[skill].level,
          oldLevel: beforeSkills[skill].level
        });
      }
      
      // Notify the target player of XP gain and potential level ups
      // Find the socket for the target player
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === targetPlayer.id);
      
      // First, send a direct update to the target player's socket if available
      if (targetSocket) {
        console.log(`Notifying player ${username} (socket ID: ${targetPlayer.id}) about XP gain via skills:update`);
        targetSocket.emit('skills:update', {
          skills: afterSkills,
          xpGained: {
            skill: skill,
            amount: xp
          },
          levelUps: levelUps
        });
      }
      
      // Always broadcast to all clients with the username to ensure the update is received
      // This ensures that even if the socket mapping is incorrect, the update will still reach the client
      console.log(`Broadcasting skills update for ${username} to all clients via skills:player:update`);
      io.emit('skills:player:update', {
        username: username,
        skills: afterSkills,
        xpGained: {
          skill: skill,
          amount: xp
        },
        levelUps: levelUps
      });
      
      // Update player object
      if (players.has(targetPlayer.id)) {
        const player = players.get(targetPlayer.id);
        player.skills = afterSkills;
      }
      
      // Send response to admin
      socket.emit('admin:awardXp:response', {
        success: true,
        message: `Awarded ${xp} ${skill} XP to ${username}`,
        levelUps: levelUps
      });
    } catch (error) {
      console.error('Error handling admin:awardXp:', error);
      socket.emit('admin:awardXp:response', {
        success: false,
        message: `Error: ${error.message}`
      });
    }
  });

  // Remove a world item
  socket.on('admin:removeWorldItem', (data) => {
    if (!isAdmin()) {
      socket.emit('admin:error', { message: 'Unauthorized access' });
      return;
    }

    try {
      const { itemUuid } = data;
      
      if (!worldItems.has(itemUuid)) {
        socket.emit('admin:error', { message: `Item with UUID ${itemUuid} not found` });
        return;
      }
      
      // Get the item before removing it
      const item = worldItems.get(itemUuid);
      
      // Remove from world items map and database
      const success = removeWorldItem(worldItems, itemUuid);
      
      if (success) {
        // Notify all clients about the removed item
        io.emit('item-removed', itemUuid);
        
        socket.emit('admin:removeWorldItem:response', { 
          success: true, 
          message: `Item ${item.name} removed successfully`,
          itemUuid
        });
      } else {
        socket.emit('admin:error', { message: 'Failed to remove item from world' });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      socket.emit('admin:error', { message: `Error removing item: ${error.message}` });
    }
  });
}
