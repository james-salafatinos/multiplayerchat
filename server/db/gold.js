// server/db/gold.js
// Database operations for player gold

let db;

// Initialize gold column if needed
function initGoldColumn() {
  try {
    // Check if gold column exists in player_state
    const tableInfo = db.prepare("PRAGMA table_info(player_state)").all();
    const hasGoldColumn = tableInfo.some(column => column.name === 'gold');
    
    if (!hasGoldColumn) {
      console.log('Adding gold column to player_state table...');
      db.exec('ALTER TABLE player_state ADD COLUMN gold INTEGER NOT NULL DEFAULT 100');
      console.log('Successfully added gold column with default 100 gold');
    }
  } catch (error) {
    console.error('Error initializing gold column:', error);
    throw error;
  }
}

// Get player's gold amount
function getPlayerGold(userId) {
  try {
    const stmt = db.prepare('SELECT gold FROM player_state WHERE user_id = ?');
    const result = stmt.get(userId);
    
    if (result) {
      return result.gold;
    } else {
      // If no record exists, create one with default gold
      const defaultGold = 100;
      return defaultGold;
    }
  } catch (error) {
    console.error('Error getting player gold:', error);
    throw error;
  }
}

// Update player's gold amount
function updatePlayerGold(userId, amount) {
  try {
    // Ensure amount is not negative
    if (amount < 0) amount = 0;
    
    const stmt = db.prepare('UPDATE player_state SET gold = ? WHERE user_id = ?');
    const result = stmt.run(amount, userId);
    
    if (result.changes === 0) {
      // No record exists yet, create one
      const insertStmt = db.prepare('INSERT INTO player_state (user_id, gold, position_x, position_y, position_z, color) VALUES (?, ?, 0, 0, 0, ?)');
      const color = '#' + Math.floor(Math.random()*16777215).toString(16); // Random color
      insertStmt.run(userId, amount, color);
    }
    
    return amount;
  } catch (error) {
    console.error('Error updating player gold:', error);
    throw error;
  }
}

// Add gold to player
function addPlayerGold(userId, amount) {
  try {
    if (amount <= 0) return getPlayerGold(userId);
    
    const currentGold = getPlayerGold(userId);
    const newAmount = currentGold + amount;
    
    return updatePlayerGold(userId, newAmount);
  } catch (error) {
    console.error('Error adding player gold:', error);
    throw error;
  }
}

// Remove gold from player
function removePlayerGold(userId, amount) {
  try {
    if (amount <= 0) return getPlayerGold(userId);
    
    const currentGold = getPlayerGold(userId);
    const newAmount = Math.max(0, currentGold - amount);
    
    return updatePlayerGold(userId, newAmount);
  } catch (error) {
    console.error('Error removing player gold:', error);
    throw error;
  }
}

// Initialize with db instance
export function initGoldModule(dbInstance) {
  db = dbInstance;
  initGoldColumn();
}

// Export the functions as goldStatements object
export const goldStatements = {
  getPlayerGold,
  updatePlayerGold,
  addPlayerGold,
  removePlayerGold
};
