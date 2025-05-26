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
    `;
    
    document.body.appendChild(adminPanel);
    
    // Add CSS for admin panel
    const style = document.createElement('style');
    style.textContent = `
        .admin-button {
            position: fixed;
            bottom: 10px;
            left: 10px;
            z-index: 1000;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
        }
        
        .admin-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            max-height: 80vh;
            background-color: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: #3498db;
            color: white;
        }
        
        .admin-header h2 {
            margin: 0;
            font-size: 18px;
        }
        
        .admin-header button {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        
        .admin-auth, .admin-content, .admin-section {
            padding: 16px;
        }
        
        .admin-section {
            margin-bottom: 16px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .admin-section h3 {
            margin-top: 0;
        }
        
        .position-inputs {
            display: flex;
            gap: 8px;
            margin: 12px 0;
        }
        
        .position-inputs input {
            width: 60px;
        }
        
        #item-select, #spawn-item, #refresh-items {
            width: 100%;
            padding: 8px;
            margin: 8px 0;
        }
        
        .world-items-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 8px;
        }
        
        .world-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .world-item:last-child {
            border-bottom: none;
        }
        
        .world-item button {
            background-color: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
        }
        
        .hidden {
            display: none !important;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Set up event listeners for the admin panel
 */
function setupEventListeners() {
    const socket = getSocket();
    if (!socket) {
        console.error('Socket not available for admin panel');
        return;
    }
    
    // Admin button click
    document.getElementById('admin-button').addEventListener('click', () => {
        document.getElementById('admin-panel').classList.remove('hidden');
    });
    
    // Close button click
    document.getElementById('admin-close').addEventListener('click', () => {
        document.getElementById('admin-panel').classList.add('hidden');
    });
    
    // Admin login
    document.getElementById('admin-login').addEventListener('click', () => {
        const password = document.getElementById('admin-password').value;
        socket.emit('admin:auth', { password });
    });
    
    // Spawn item button
    document.getElementById('spawn-item').addEventListener('click', () => {
        if (!isAdmin) return;
        
        const itemId = document.getElementById('item-select').value;
        if (!itemId) {
            alert('Please select an item to spawn');
            return;
        }
        
        const position = {
            x: parseFloat(document.getElementById('pos-x').value),
            y: parseFloat(document.getElementById('pos-y').value),
            z: parseFloat(document.getElementById('pos-z').value)
        };
        
        socket.emit('admin:spawnItem', { itemId, position });
    });
    
    // Refresh world items
    document.getElementById('refresh-items').addEventListener('click', () => {
        if (!isAdmin) return;
        socket.emit('admin:getWorldItems');
    });
    
    // Socket event listeners
    socket.on('admin:auth:response', (data) => {
        if (data.success) {
            isAdmin = true;
            document.getElementById('admin-auth').classList.add('hidden');
            document.getElementById('admin-content').classList.remove('hidden');
            
            // Load available items
            socket.emit('admin:getItems');
            socket.emit('admin:getWorldItems');
        } else {
            alert('Admin authentication failed');
        }
    });
    
    socket.on('admin:itemsList', (items) => {
        availableItems = items;
        updateItemSelect();
    });
    
    socket.on('admin:worldItemsList', (items) => {
        worldItems = items;
        updateWorldItemsList();
    });
    
    socket.on('admin:spawnItem:response', (data) => {
        if (data.success) {
            alert(data.message);
            socket.emit('admin:getWorldItems');
        } else {
            alert(`Error: ${data.message}`);
        }
    });
    
    socket.on('admin:error', (data) => {
        alert(`Admin Error: ${data.message}`);
    });
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
