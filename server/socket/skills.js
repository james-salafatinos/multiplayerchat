// server/socket/skills.js
// Socket handlers for player skills and XP

import { statements } from '../db/index.js';

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

/**
 * Award XP to a player in a specific skill
 * @param {number} userId - User ID
 * @param {string} skill - Skill name (strength, hitpoints, mining, magic)
 * @param {number} xp - XP to award
 * @returns {Object} - Updated skills data
 */
function awardXp(userId, skill, xp) {
  try {
    // Make sure player has skills entry
    statements.initPlayerSkills.run(userId);
    
    // Get current skills data to check for level ups
    const beforeSkills = getPlayerSkillsData(userId);
    
    // Award XP to the appropriate skill
    switch (skill) {
      case 'strength':
        statements.updateStrengthXp.run(xp, userId);
        break;
      case 'hitpoints':
        statements.updateHitpointsXp.run(xp, userId);
        break;
      case 'mining':
        statements.updateMiningXp.run(xp, userId);
        break;
      case 'magic':
        statements.updateMagicXp.run(xp, userId);
        break;
      default:
        console.error(`Invalid skill: ${skill}`);
        return beforeSkills;
    }
    
    // Get updated skills data
    const afterSkills = getPlayerSkillsData(userId);
    
    // Check for level ups
    const levelUps = [];
    if (afterSkills[skill].level > beforeSkills[skill].level) {
      levelUps.push({
        skill,
        newLevel: afterSkills[skill].level,
        oldLevel: beforeSkills[skill].level
      });
    }
    
    return { skills: afterSkills, levelUps };
  } catch (error) {
    console.error(`Error awarding XP to ${userId} in ${skill}:`, error);
    return { skills: getPlayerSkillsData(userId), levelUps: [] };
  }
}

/**
 * Set up skills socket handlers
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 * @param {Object} players - Map of connected players
 * @param {Object} userData - User data for the connected player
 */
export default function setupSkillsHandlers(io, socket, players, userData) {
  // Initialize player skills on connection
  try {
    statements.initPlayerSkills.run(userData.id);
    
    // Get initial skills data
    const skillsData = getPlayerSkillsData(userData.id);
    
    // Send initial skills data to client
    socket.emit('skills:update', { skills: skillsData });
    
    // Store skills data in player object
    const player = players.get(socket.id);
    if (player) {
      player.skills = skillsData;
    }
  } catch (error) {
    console.error('Error initializing player skills:', error);
  }
  
  // Handle client requesting skills data
  socket.on('skills:request', () => {
    try {
      const skillsData = getPlayerSkillsData(userData.id);
      socket.emit('skills:update', { skills: skillsData });
    } catch (error) {
      console.error('Error handling skills request:', error);
    }
  });
  
  // Admin: Award XP to a player
  socket.on('admin:awardXp', (data) => {
    try {
      // Verify user is an admin (you might want to add proper admin checks)
      // For now, we'll just log the action
      console.log(`Admin ${userData.username} awarding ${data.xp} ${data.skill} XP to player ${data.username}`);
      
      // Find the target user ID
      const targetUser = Array.from(players.values()).find(p => p.username === data.username);
      
      if (!targetUser || !targetUser.userId) {
        socket.emit('admin:awardXp:response', { 
          success: false, 
          message: `Player ${data.username} not found or not online` 
        });
        return;
      }
      
      // Award XP
      const result = awardXp(targetUser.userId, data.skill, data.xp);
      
      // Notify the target player of XP gain and potential level ups
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === targetUser.socketId);
      
      if (targetSocket) {
        targetSocket.emit('skills:update', { 
          skills: result.skills,
          xpGained: {
            skill: data.skill,
            amount: data.xp
          },
          levelUps: result.levelUps
        });
      }
      
      // Update player object
      if (players.has(targetUser.socketId)) {
        const player = players.get(targetUser.socketId);
        player.skills = result.skills;
      }
      
      // Send response to admin
      socket.emit('admin:awardXp:response', { 
        success: true, 
        message: `Awarded ${data.xp} ${data.skill} XP to ${data.username}`,
        levelUps: result.levelUps
      });
    } catch (error) {
      console.error('Error handling admin:awardXp:', error);
      socket.emit('admin:awardXp:response', { 
        success: false, 
        message: `Error: ${error.message}` 
      });
    }
  });
}
