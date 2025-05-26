// Admin Panel for item spawning and management
import { getSocket } from '../network.js';

let isAdmin = false;
let availableItems = [];
let worldItems = [];

/**
 * Initialize the admin panel
 */
export function initAdminPanel() {
    createAdminUI();
    setupEventListeners();
}

/**
 * Create the admin UI elements
 */
function createAdminUI() {
    // Create admin button in the top right corner
    const adminButton = document.createElement('button');
    adminButton.id = 'admin-button';
    adminButton.textContent = 'Admin';
    adminButton.classList.add('admin-button');
    document.body.appendChild(adminButton);

    // Create admin panel container (initially hidden)
    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.classList.add('admin-panel', 'hidden');

    // Admin panel content
    adminPanel.innerHTML = `
        <div class="admin-header">
            <h2>Admin Panel</h2>
            <button id="admin-close">×</button>
        </div>
        <div class="admin-auth" id="admin-auth">
            <h3>Authentication</h3>
            <input type="password" id="admin-password" placeholder="Admin Password">
            <button id="admin-login">Login</button>
        </div>
        <div class="admin-content hidden" id="admin-content">
            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="items">Items</button>
                <button class="admin-tab" data-tab="skills">Skills</button>
            </div>
            <div class="admin-tab-content active" id="tab-items">
            <div class="admin-section">
                <h3>Spawn Item</h3>
                <select id="item-select">
                    <option value="">Select an item...</option>
                </select>
                <div class="position-inputs">
                    <label>
                        X:
                        <input type="number" id="pos-x" value="0" step="0.5">
                    </label>
                    <label>
                        Y:
                        <input type="number" id="pos-y" value="0.15" step="0.05">
                    </label>
                    <label>
                        Z:
                        <input type="number" id="pos-z" value="0" step="0.5">
                    </label>
                </div>
                <button id="spawn-item">Spawn Item</button>
            </div>
            <div class="admin-section">
                <h3>World Items</h3>
                <button id="refresh-items">Refresh</button>
                <div class="world-items-list" id="world-items-list">
                    <p>No items in world</p>
                </div>
            </div>
            </div>
            <div class="admin-tab-content" id="tab-skills">
                <div class="admin-section">
                    <h3>Award XP</h3>
                    <select id="player-select">
                        <option value="">Select a player...</option>
                    </select>
                    <select id="skill-select">
                        <option value="">Select a skill...</option>
                        <option value="strength">Strength</option>
                        <option value="hitpoints">Hitpoints</option>
                        <option value="mining">Mining</option>
                        <option value="magic">Magic</option>
                    </select>
                    <input type="number" id="xp-amount" placeholder="XP Amount" min="1" value="100">
                    <button id="award-xp">Award XP</button>
                    <div id="xp-result" class="admin-result"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(adminPanel);

    // Add CSS for admin panel
    const style = document.createElement('style');
    style.textContent = `
        .admin-button {
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: #e94560;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            z-index: 1000;
        }
        
        .admin-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            max-height: 80vh;
            background-color: rgba(22, 33, 62, 0.95);
            border: 2px solid #444;
            border-radius: 8px;
            padding: 20px;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        
        .admin-panel.hidden {
            display: none;
        }
        
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        }
        
        .admin-header h2 {
            color: #e94560;
            margin: 0;
        }
        
        #admin-close {
            background: none;
            border: none;
            color: #aaa;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        
        #admin-close:hover {
            color: #e94560;
        }
        
        .admin-tabs {
            display: flex;
            margin-bottom: 15px;
            border-bottom: 1px solid #444;
        }
        
        .admin-tab {
            background: none;
            border: none;
            color: #aaa;
            padding: 8px 16px;
            cursor: pointer;
            font-weight: bold;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
        }
        
        .admin-tab.active {
            color: #e94560;
            border-bottom: 2px solid #e94560;
        }
        
        .admin-tab-content {
            display: none;
        }
        
        .admin-tab-content.active {
            display: block;
        }
        
        .admin-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: rgba(42, 42, 64, 0.7);
            border-radius: 4px;
        }
        
        .admin-section h3 {
            margin-top: 0;
            color: #e94560;
            margin-bottom: 10px;
        }
        
        .admin-content.hidden, .admin-auth.hidden {
            display: none;
        }
        
        input, select, button {
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            border: 1px solid #444;
            background-color: #2a2a40;
            color: white;
        }
        
        button {
            background-color: #e94560;
            border: none;
            cursor: pointer;
            font-weight: bold;
        }
        
        button:hover {
            background-color: #c13e54;
        }
        
        .position-inputs {
            display: flex;
            gap: 10px;
            margin: 10px 0;
        }
        
        .position-inputs input {
            width: 60px;
        }
        
        #world-items-list {
            max-height: 200px;
            overflow-y: auto;
            margin-top: 10px;
        }
        
        .world-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid #444;
        }
        
        .world-item:last-child {
            border-bottom: none;
        }
        
        .world-item-name {
            font-weight: bold;
            color: #e94560;
        }
        
        .world-item-pos {
            font-size: 0.8rem;
            color: #aaa;
        }
        
        .world-item-actions {
            display: flex;
            gap: 5px;
        }
        
        .world-item-actions button {
            padding: 4px 8px;
            font-size: 0.8rem;
        }
        
        .admin-result {
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .admin-result.success {
            background-color: rgba(39, 174, 96, 0.3);
            border: 1px solid #27ae60;
            color: #2ecc71;
        }
        
        .admin-result.error {
            background-color: rgba(231, 76, 60, 0.3);
            border: 1px solid #e74c3c;
            color: #e74c3c;
        }
    `;

    document.head.appendChild(style);
}

/**
 * Set up event listeners for the admin panel
 */
function setupEventListeners() {
    const adminButton = document.getElementById('admin-button');
    const adminPanel = document.getElementById('admin-panel');
    const adminClose = document.getElementById('admin-close');
    const adminLogin = document.getElementById('admin-login');
    const adminAuth = document.getElementById('admin-auth');
    const adminContent = document.getElementById('admin-content');
    const spawnItem = document.getElementById('spawn-item');
    const refreshItems = document.getElementById('refresh-items');
    const awardXp = document.getElementById('award-xp');

    // Toggle admin panel
    adminButton.addEventListener('click', () => {
        adminPanel.classList.toggle('hidden');
    });

    // Close admin panel
    adminClose.addEventListener('click', () => {
        adminPanel.classList.add('hidden');
    });

    // Admin login
    adminLogin.addEventListener('click', () => {
        const password = document.getElementById('admin-password').value;
        const socket = getSocket();
        
        if (socket) {
            // Send authentication request to server
            socket.emit('admin:auth', { password });
            
            // Listen for response
            socket.once('admin:auth:response', (response) => {
                if (response.success) {
                    isAdmin = true;
                    adminAuth.classList.add('hidden');
                    adminContent.classList.remove('hidden');
                    
                    console.log('Admin authentication successful, fetching items and players...');
                    // Load available items and players
                    fetchAvailableItems();
                    fetchWorldItems();
                    fetchPlayers();
                } else {
                    alert('Invalid password');
                }
            });
        } else {
            alert('Not connected to server');
        }
    });

    // Tab switching
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and tab contents
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`tab-${tabName}`).classList.add('active');

            // Refresh data based on tab
            if (tabName === 'items') {
                fetchAvailableItems();
                fetchWorldItems();
            } else if (tabName === 'skills') {
                fetchPlayers();
            }
        });
    });

    // Spawn item
    if (spawnItem) {
        spawnItem.addEventListener('click', () => {
            const itemId = document.getElementById('item-select').value;
            const posX = parseFloat(document.getElementById('pos-x').value);
            const posY = parseFloat(document.getElementById('pos-y').value);
            const posZ = parseFloat(document.getElementById('pos-z').value);

            if (!itemId) {
                alert('Please select an item');
                return;
            }

            const socket = getSocket();
            if (socket) {
                socket.emit('admin:spawnItem', {
                    itemId,
                    position: { x: posX, y: posY, z: posZ }
                });

                // Update world items list after a short delay
                setTimeout(fetchWorldItems, 500);
            }
        });
    }

    // Award XP
    if (awardXp) {
        awardXp.addEventListener('click', () => {
            const username = document.getElementById('player-select').value;
            const skill = document.getElementById('skill-select').value;
            const xp = parseInt(document.getElementById('xp-amount').value);
            const resultElement = document.getElementById('xp-result');

            if (!username || !skill || isNaN(xp) || xp <= 0) {
                resultElement.textContent = 'Please fill in all fields correctly';
                resultElement.className = 'admin-result error';
                return;
            }

            const socket = getSocket();
            if (socket) {
                socket.emit('admin:awardXp', {
                    username,
                    skill,
                    xp
                });

                // Listen for response
                socket.once('admin:awardXp:response', (response) => {
                    if (response.success) {
                        resultElement.textContent = response.message;
                        resultElement.className = 'admin-result success';

                        // Show level up info if applicable
                        if (response.levelUps && response.levelUps.length > 0) {
                            const levelUp = response.levelUps[0];
                            resultElement.textContent += ` Level up! ${levelUp.skill} is now level ${levelUp.newLevel}!`;
                        }
                    } else {
                        resultElement.textContent = response.message || 'Error awarding XP';
                        resultElement.className = 'admin-result error';
                    }
                });
            }
        });
    }

    // Refresh items
    if (refreshItems) {
        refreshItems.addEventListener('click', () => {
            fetchAvailableItems();
            fetchWorldItems();
        });
    }

    // Set up event delegation for world item actions
    const worldItemsList = document.getElementById('world-items-list');
    if (worldItemsList) {
        worldItemsList.addEventListener('click', (event) => {
            const target = event.target;

            // Handle delete button
            if (target.classList.contains('delete-item')) {
                const itemUuid = target.dataset.uuid;
                const socket = getSocket();

                if (socket && itemUuid) {
                    socket.emit('admin:removeWorldItem', { uuid: itemUuid });

                    // Update world items list after a short delay
                    setTimeout(fetchWorldItems, 500);
                }
            }

            // Handle teleport button
            if (target.classList.contains('teleport-to-item')) {
                const itemUuid = target.dataset.uuid;
                const item = worldItems.find(item => item.uuid === itemUuid);

                if (item && item.position) {
                    const socket = getSocket();
                    if (socket) {
                        socket.emit('player:teleport', {
                            position: item.position
                        });
                    }
                }
            }
        });
    }
}

function fetchAvailableItems() {
    const socket = getSocket();
    if (socket) {
        // Set up a one-time listener for the response
        socket.once('admin:availableItems', (items) => {
            console.log('Received available items:', items);
            availableItems = items;
            updateItemSelect();
        });

        // Request available items
        socket.emit('admin:getAvailableItems');
    }
}
function fetchWorldItems() {
    const socket = getSocket();
    if (socket) {
        // Set up a one-time listener for the response
        socket.once('admin:worldItems', (items) => {
            console.log('Received world items:', items);
            worldItems = items;
            updateWorldItemsList();
        });

        // Request world items
        socket.emit('admin:getWorldItems');
    }
}
function fetchPlayers() {
    const socket = getSocket();
    if (socket) {
        // Set up a one-time listener for the response
        socket.once('admin:players', (players) => {
            console.log('Received players:', players);
            updatePlayerSelect(players);
        });

        // Request players
        socket.emit('admin:getPlayers');
    }
}
/**
 * Update player select dropdown with online players
 */
function updatePlayerSelect(players) {
    const playerSelect = document.getElementById('player-select');
    if (!playerSelect) return;
    
    // Clear existing options except the first one
    while (playerSelect.options.length > 1) {
        playerSelect.remove(1);
    }
    
    // Add players to select
    if (players && players.length > 0) {
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.username;
            option.textContent = player.username;
            playerSelect.appendChild(option);
        });
    }
}

    /**
     * Update the item select dropdown with available items
     */
    function updateItemSelect() {
        const select = document.getElementById('item-select');

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add options for each available item
        availableItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.id})`;
            select.appendChild(option);
        });
    }

/**
 * Update the world items list
 */
function updateWorldItemsList() {
    const container = document.getElementById('world-items-list');

    if (worldItems.length === 0) {
        container.innerHTML = '<p>No items in world</p>';
        return;
    }

    container.innerHTML = '';

    worldItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('world-item');

        const itemInfo = document.createElement('div');
        itemInfo.innerHTML = `
            <strong>${item.name}</strong> (${item.id})<br>
            Position: ${item.position.x.toFixed(1)}, ${item.position.y.toFixed(1)}, ${item.position.z.toFixed(1)}
        `;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
            if (confirm(`Remove ${item.name}?`)) {
                const socket = getSocket();
                if (socket) {
                    socket.emit('admin:removeWorldItem', { itemUuid: item.uuid });
                }
            }
        });

        itemElement.appendChild(itemInfo);
        itemElement.appendChild(removeButton);
        container.appendChild(itemElement);
    });
}
