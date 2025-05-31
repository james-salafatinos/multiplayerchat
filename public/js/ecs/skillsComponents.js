// ECS Skills Components
// Components for player skills and XP

import { Component } from './core/index.js';

/**
 * Skills Component
 * Stores a player's skills and experience points
 */
export class SkillsComponent extends Component {
    constructor(data = {}) {
        super({
            // Initialize skills with default values
            strength: data.strength || { level: 1, xp: 0 },
            hitpoints: data.hitpoints || { level: 1, xp: 0 },
            mining: data.mining || { level: 1, xp: 0 },
            magic: data.magic || { level: 1, xp: 0 },
            // Track whether skills need to be updated in the UI
            needsUpdate: true
        });
    }

    /**
     * Get the level for a specific skill
     * @param {string} skillName - Name of the skill
     * @returns {number} - Current level of the skill
     */
    getLevel(skillName) {
        if (this[skillName]) {
            return this[skillName].level;
        }
        return 1; // Default level
    }

    /**
     * Get the XP for a specific skill
     * @param {string} skillName - Name of the skill
     * @returns {number} - Current XP of the skill
     */
    getXp(skillName) {
        if (this[skillName]) {
            return this[skillName].xp;
        }
        return 0; // Default XP
    }

    /**
     * Update skills data from server
     * @param {Object} skillsData - Skills data from server
     */
    updateFromServer(skillsData) {
        if (!skillsData) return;
        
        // Update each skill
        if (skillsData.strength) this.strength = skillsData.strength;
        if (skillsData.hitpoints) this.hitpoints = skillsData.hitpoints;
        if (skillsData.mining) this.mining = skillsData.mining;
        if (skillsData.magic) this.magic = skillsData.magic;
        
        // Mark for UI update
        this.needsUpdate = true;
    }
}
