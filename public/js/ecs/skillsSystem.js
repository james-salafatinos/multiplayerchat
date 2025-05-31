// ECS Skills System
// Handles skills UI and XP interactions

import { System } from './core/index.js';
import { SkillsComponent } from './skillsComponents.js';

/**
 * Skills System
 * Manages player skills, XP, and the skills UI
 */
export class SkillsSystem extends System {
    constructor(socket) {
        super();
        this.requiredComponents = ['PlayerComponent'];
        this.socket = socket;
        
        // Queue for pending skills updates received before world is initialized
        this.pendingSkillsUpdates = [];
        
        // Store the latest skills data received from the server
        this.latestSkillsData = null;
        
        // XP to level mapping based on Runescape scaling
        this.XP_TO_LEVEL = [
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
        
        // Set up skills UI
        this.setupSkillsUI();
        
        // Listen for socket events
        if (this.socket) {
            // Handle direct skills updates for the local player
            this.socket.on('skills:update', (data) => {
                console.log('[SkillsSystem] Received skills update from server:', data);
                
                // Store the latest skills data
                this.latestSkillsData = data.skills;
                
                // Always update the UI directly, even if world is not available
                this.updateSkillsUIDirectly(data.skills);
                
                // Show notifications
                if (data.xpGained) {
                    this.showXpNotification(data.xpGained.skill, data.xpGained.amount);
                }
                
                if (data.levelUps && data.levelUps.length > 0) {
                    data.levelUps.forEach(levelUp => {
                        this.showLevelUpNotification(levelUp.skill, levelUp.newLevel);
                    });
                }
                
                // If world is not available yet, queue the update for later entity processing
                if (!this.world) {
                    console.warn('[SkillsSystem] skills:update: this.world is not yet available. Queuing update for later entity processing.');
                    this.pendingSkillsUpdates.push({ type: 'skills:update', data });
                    return;
                }
                
                this.processSkillsUpdate(data);
            });
            
            // Handle skills updates for specific players (from admin panel)
            this.socket.on('skills:player:update', (data) => {
                console.log('[SkillsSystem] Received player skills update from server:', data);
                
                // Get current user's username from localStorage
                const currentUsername = localStorage.getItem('username');
                
                // If this update is for the current user, update the UI directly
                if (currentUsername && data.username === currentUsername) {
                    console.log(`[SkillsSystem] Received skills update for current user ${currentUsername}`);
                    
                    // Store the latest skills data
                    this.latestSkillsData = data.skills;
                    
                    // Update the UI directly
                    this.updateSkillsUIDirectly(data.skills);
                    
                    // Show notifications
                    if (data.xpGained) {
                        this.showXpNotification(data.xpGained.skill, data.xpGained.amount);
                    }
                    
                    if (data.levelUps && data.levelUps.length > 0) {
                        data.levelUps.forEach(levelUp => {
                            this.showLevelUpNotification(levelUp.skill, levelUp.newLevel);
                        });
                    }
                }
                
                // If world is not available yet, queue the update for later entity processing
                if (!this.world) {
                    console.warn('[SkillsSystem] skills:player:update: this.world is not yet available. Queuing update for later entity processing.');
                    this.pendingSkillsUpdates.push({ type: 'skills:player:update', data });
                    return;
                }
                
                this.processPlayerSkillsUpdate(data);
            });
        }
    }
    
    /**
     * Initialize the system
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        console.log('[SkillsSystem] Initializing with world:', world);
        this.world = world;
        
        // Process any pending skills updates that were received before the world was initialized
        if (this.pendingSkillsUpdates.length > 0) {
            console.log(`[SkillsSystem] Processing ${this.pendingSkillsUpdates.length} pending skills updates`);
            
            // Wait a short time to ensure the world is fully initialized with player entities
            setTimeout(() => {
                // Process each pending update
                this.pendingSkillsUpdates.forEach(update => {
                    console.log(`[SkillsSystem] Processing pending ${update.type} update:`, update.data);
                    
                    if (update.type === 'skills:update') {
                        this.processSkillsUpdate(update.data);
                    } else if (update.type === 'skills:player:update') {
                        this.processPlayerSkillsUpdate(update.data);
                    }
                });
                
                // Clear the pending updates
                this.pendingSkillsUpdates = [];
            }, 1000); // 1 second delay to ensure world is ready
        }
        
        // Request initial skills data from server
        if (this.socket) {
            this.socket.emit('skills:request');
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Check if world is initialized
        if (!this.world) {
            return; // Skip update if world is not yet available
        }
        
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (localPlayerEntity) {
            // Make sure player has SkillsComponent
            if (!localPlayerEntity.hasComponent('SkillsComponent')) {
                localPlayerEntity.addComponent(new SkillsComponent());
                // Request skills data from server
                if (this.socket) {
                    this.socket.emit('skills:request');
                }
            }
            
            // Check if skills UI needs to be updated
            const skillsComponent = localPlayerEntity.getComponent('SkillsComponent');
            if (skillsComponent && skillsComponent.needsUpdate) {
                this.updateSkillsUI(skillsComponent);
                skillsComponent.needsUpdate = false;
            }
        }
    }
    
    /**
     * Process a skills update for the local player
     * @param {Object} data - The skills update data
     */
    processSkillsUpdate(data) {
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (localPlayerEntity) {
            // Make sure player has SkillsComponent
            if (!localPlayerEntity.hasComponent('SkillsComponent')) {
                localPlayerEntity.addComponent(new SkillsComponent());
            }
            
            // Update skills component with new data
            const skillsComponent = localPlayerEntity.getComponent('SkillsComponent');
            skillsComponent.updateFromServer(data.skills);
            
            // Update UI
            this.updateSkillsUI(skillsComponent);
            
            // Show XP gain notification if provided
            if (data.xpGained) {
                this.showXpNotification(data.xpGained.skill, data.xpGained.amount);
            }
            
            // Show level up notification if provided
            if (data.levelUps && data.levelUps.length > 0) {
                data.levelUps.forEach(levelUp => {
                    this.showLevelUpNotification(levelUp.skill, levelUp.newLevel);
                });
            }
        } else {
            console.warn('[SkillsSystem] processSkillsUpdate: Local player not found.');
        }
    }
    
    /**
     * Process a skills update for a specific player
     * @param {Object} data - The player skills update data
     */
    processPlayerSkillsUpdate(data) {
        // Get current user's username from localStorage to compare with the update
        const currentUsername = localStorage.getItem('username');
        
        // Check if this update is for the current user
        if (currentUsername && data.username === currentUsername) {
            console.log(`[SkillsSystem] Received skills update for current user ${currentUsername}`);
            
            // Find local player entity
            const localPlayerEntity = this.world.entities.find(entity => 
                entity.active && 
                entity.hasComponent('PlayerComponent') && 
                entity.getComponent('PlayerComponent').isLocalPlayer
            );
            
            if (localPlayerEntity) {
                console.log(`[SkillsSystem] Found local player entity, updating skills for ${currentUsername}`);
                // Make sure player has SkillsComponent
                if (!localPlayerEntity.hasComponent('SkillsComponent')) {
                    localPlayerEntity.addComponent(new SkillsComponent());
                }
                
                // Update skills component with new data
                const skillsComponent = localPlayerEntity.getComponent('SkillsComponent');
                skillsComponent.updateFromServer(data.skills);
                
                // Update UI
                this.updateSkillsUI(skillsComponent);
                
                // Show XP gain notification if provided
                if (data.xpGained) {
                    this.showXpNotification(data.xpGained.skill, data.xpGained.amount);
                }
                
                // Show level up notification if provided
                if (data.levelUps && data.levelUps.length > 0) {
                    data.levelUps.forEach(levelUp => {
                        this.showLevelUpNotification(levelUp.skill, levelUp.newLevel);
                    });
                }
            } else {
                console.warn(`[SkillsSystem] Local player entity not found for username ${currentUsername}`);
            }
        } else {
            console.log(`[SkillsSystem] Received skills update for ${data.username}, but current user is ${currentUsername || 'unknown'}, ignoring`);
        }
    }
    
    /**
     * Initialize the system
     * @param {World} world - The world this system belongs to
     */
    init(world) {
        this.world = world;
        
        // Request initial skills data from server
        if (this.socket) {
            this.socket.emit('skills:request');
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Check if world is initialized
        if (!this.world) {
            return; // Skip update if world is not yet available
        }
        
        // Find local player entity
        const localPlayerEntity = this.world.entities.find(entity => 
            entity.active && 
            entity.hasComponent('PlayerComponent') && 
            entity.getComponent('PlayerComponent').isLocalPlayer
        );
        
        if (localPlayerEntity) {
            // Make sure player has SkillsComponent
            if (!localPlayerEntity.hasComponent('SkillsComponent')) {
                localPlayerEntity.addComponent(new SkillsComponent());
                // Request skills data from server
                if (this.socket) {
                    this.socket.emit('skills:request');
                }
            }
            
            // Check if skills UI needs to be updated
            const skillsComponent = localPlayerEntity.getComponent('SkillsComponent');
            if (skillsComponent && skillsComponent.needsUpdate) {
                this.updateSkillsUI(skillsComponent);
                skillsComponent.needsUpdate = false;
            }
        }
    }
    
    /**
     * Set up the skills UI
     */
    setupSkillsUI() {
        console.log('[SkillsSystem] Setting up skills UI');
        
        // Create skills toggle button if it doesn't exist
        if (!document.getElementById('skills-toggle')) {
            const skillsToggle = document.createElement('button');
            skillsToggle.id = 'skills-toggle';
            skillsToggle.className = 'skills-toggle';
            skillsToggle.textContent = 'Skills';
  
            document.body.appendChild(skillsToggle);
        }
        
        // Create skills panel if it doesn't exist
        if (!document.getElementById('skills-panel')) {
            const skillsPanel = document.createElement('div');
            skillsPanel.id = 'skills-panel';
            skillsPanel.className = 'skills-panel';
            skillsPanel.style.display = 'none'; // Hidden by default
            
            // Add panel header
            const panelHeader = document.createElement('div');
            panelHeader.className = 'skills-panel-header';
            
            const panelTitle = document.createElement('h2');
            panelTitle.textContent = 'Skills';
            panelHeader.appendChild(panelTitle);
            
            const closeButton = document.createElement('span');
            closeButton.className = 'skills-panel-close';
            closeButton.textContent = '×';
            closeButton.addEventListener('click', () => {
                skillsPanel.style.display = 'none';
            });
            panelHeader.appendChild(closeButton);
            
            skillsPanel.appendChild(panelHeader);
            
            // Add skills content
            const skillsContent = document.createElement('div');
            skillsContent.className = 'skills-panel-content';
            
            // Add each skill
            const skills = ['strength', 'hitpoints', 'mining', 'magic'];
            skills.forEach(skill => {
                const skillItem = document.createElement('div');
                skillItem.className = 'skill-item';
                skillItem.id = `skill-${skill}`;
                
                const skillName = document.createElement('div');
                skillName.className = 'skill-name';
                skillName.textContent = skill.charAt(0).toUpperCase() + skill.slice(1);
                skillItem.appendChild(skillName);
                
                const skillLevel = document.createElement('div');
                skillLevel.className = 'skill-level';
                skillLevel.textContent = '1';
                skillItem.appendChild(skillLevel);
                
                const skillXp = document.createElement('div');
                skillXp.className = 'skill-xp';
                skillXp.textContent = '0 XP';
                skillItem.appendChild(skillXp);
                
                const skillNextLevel = document.createElement('div');
                skillNextLevel.className = 'skill-next-level';
                skillNextLevel.textContent = '83 XP to level 2';
                skillItem.appendChild(skillNextLevel);
                
                skillsContent.appendChild(skillItem);
            });
            
            skillsPanel.appendChild(skillsContent);
            document.body.appendChild(skillsPanel);
            
            console.log('[SkillsSystem] Skills panel created');
        }
        
        // Set up toggle button click handler
        const skillsToggle = document.getElementById('skills-toggle');
        const skillsPanel = document.getElementById('skills-panel');
        
        if (skillsToggle && skillsPanel) {
            // Remove any existing click handlers
            const newToggle = skillsToggle.cloneNode(true);
            skillsToggle.parentNode.replaceChild(newToggle, skillsToggle);
            
            // Add click event to toggle skills panel
            newToggle.addEventListener('click', () => {
                if (skillsPanel.style.display === 'none') {
                    skillsPanel.style.display = 'block';
                    
                    // If we have latest skills data, update the UI
                    if (this.latestSkillsData) {
                        console.log('[SkillsSystem] Updating skills panel with latest data on open');
                        this.updateSkillsUIDirectly(this.latestSkillsData);
                    } else {
                        console.log('[SkillsSystem] No latest skills data available to update panel');
                        // Request skills data from server
                        if (this.socket) {
                            this.socket.emit('skills:request');
                        }
                    }
                } else {
                    skillsPanel.style.display = 'none';
                }
            });
            
            console.log('[SkillsSystem] Skills toggle button handler set up');
        }
    }
    
    /**
     * Update the skills UI directly from skills data without requiring a component
     * @param {Object} skillsData - The skills data from the server
     */
    updateSkillsUIDirectly(skillsData) {
        console.log('[SkillsSystem] Updating skills UI directly with data:', skillsData);
        
        if (!skillsData) {
            console.warn('[SkillsSystem] No skills data provided for direct UI update');
            return;
        }
        
        // Update each skill in the UI
        if (skillsData.strength) {
            this.updateSkillDisplay('strength', skillsData.strength.level, skillsData.strength.xp);
        }
        
        if (skillsData.hitpoints) {
            this.updateSkillDisplay('hitpoints', skillsData.hitpoints.level, skillsData.hitpoints.xp);
        }
        
        if (skillsData.mining) {
            this.updateSkillDisplay('mining', skillsData.mining.level, skillsData.mining.xp);
        }
        
        if (skillsData.magic) {
            this.updateSkillDisplay('magic', skillsData.magic.level, skillsData.magic.xp);
        }
    }
    
    /**
     * Update a specific skill display in the UI
     * @param {string} skillName - The name of the skill
     * @param {number} level - The current level
     * @param {number} xp - The current XP
     */
    updateSkillDisplay(skillName, level, xp) {
        const skillElement = document.getElementById(`skill-${skillName}`);
        if (!skillElement) {
            console.warn(`[SkillsSystem] Skill element for ${skillName} not found`);
            return;
        }
        
        // Update level display
        const levelElement = skillElement.querySelector('.skill-level');
        if (levelElement) {
            levelElement.textContent = level;
        }
        
        // Update XP display
        const xpElement = skillElement.querySelector('.skill-xp');
        if (xpElement) {
            xpElement.textContent = `${xp} XP`;
        }
        
        // Update next level XP display
        const nextLevelElement = skillElement.querySelector('.skill-next-level');
        if (nextLevelElement) {
            const nextLevelXp = this.XP_TO_LEVEL[level];
            nextLevelElement.textContent = `${nextLevelXp} XP to level ${level + 1}`;
        }
    }
    
    /**
     * Update the skills UI with current data from a component
     * @param {SkillsComponent} skillsComponent - The skills component to display
     */
    updateSkillsUI(skillsComponent) {
        if (!skillsComponent) return;
        
        // Update each skill in the UI
        const skills = ['strength', 'hitpoints', 'mining', 'magic'];
        skills.forEach(skill => {
            const skillData = skillsComponent[skill];
            if (!skillData) return;
            
            const skillItem = document.getElementById(`skill-${skill}`);
            if (!skillItem) return;
            
            // Update level
            const levelElement = skillItem.querySelector('.skill-level');
            if (levelElement) {
                levelElement.textContent = skillData.level;
            }
            
            // Update XP text
            const currentXpElement = skillItem.querySelector('.current-xp');
            if (currentXpElement) {
                currentXpElement.textContent = `${skillData.xp.toLocaleString()} XP`;
            }
            
            // Update next level text
            const nextLevelElement = skillItem.querySelector('.next-level');
            if (nextLevelElement) {
                if (skillData.level < 99) {
                    const nextLevelXp = this.XP_TO_LEVEL[skillData.level];
                    const xpToNextLevel = nextLevelXp - skillData.xp;
                    nextLevelElement.textContent = `${xpToNextLevel.toLocaleString()} XP to level ${skillData.level + 1}`;
                } else {
                    nextLevelElement.textContent = 'Max level';
                }
            }
            
            // Update progress bar
            const progressBar = skillItem.querySelector('.skill-progress-bar');
            if (progressBar) {
                if (skillData.level < 99) {
                    const currentLevelXp = this.XP_TO_LEVEL[skillData.level - 1] || 0;
                    const nextLevelXp = this.XP_TO_LEVEL[skillData.level];
                    const levelProgress = (skillData.xp - currentLevelXp) / (nextLevelXp - currentLevelXp) * 100;
                    progressBar.style.width = `${levelProgress}%`;
                } else {
                    progressBar.style.width = '100%';
                }
            }
        });
    }
    
    /**
     * Show XP gain notification
     * @param {string} skill - Skill name
     * @param {number} amount - XP gained
     */
    showXpNotification(skill, amount) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.textContent = `+${amount} ${skill.charAt(0).toUpperCase() + skill.slice(1)} XP`;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
    
    /**
     * Show level up notification
     * @param {string} skill - Skill name
     * @param {number} level - New level
     */
    showLevelUpNotification(skill, level) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        
        const title = document.createElement('h3');
        title.textContent = 'Level Up!';
        
        const message = document.createElement('p');
        message.textContent = `Your ${skill.charAt(0).toUpperCase() + skill.slice(1)} level is now ${level}!`;
        
        notification.appendChild(title);
        notification.appendChild(message);
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    /**
     * Calculate level from XP
     * @param {number} xp - Experience points
     * @returns {number} - Level (1-99)
     */
    calculateLevel(xp) {
        if (xp <= 0) return 1;
        
        for (let level = 1; level < this.XP_TO_LEVEL.length; level++) {
            if (xp < this.XP_TO_LEVEL[level]) {
                return level;
            }
        }
        
        return 99; // Max level
    }
}
