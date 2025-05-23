# Multiplayer Three.js Application

A real-time multiplayer 3D application with Three.js, Socket.io, and a persistent chat system using SQLite.

## Features

- 3D scene with Three.js and Entity Component System (ECS) architecture
- Rotating cube synchronized across all connected clients
- Real-time chat system with persistent message storage
- Connected user awareness
- Inventory system with item pickup and management

## Detailed Architecture Breakdown

### Client-Side Architecture

#### Core Files

- **`public/index.html`**: Main HTML entry point that sets up the UI layout and loads all scripts
- **`public/js/app.js`**: Core application entry point that initializes the ECS world, sets up systems, and manages the game loop
- **`public/js/network.js`**: Centralizes all Socket.io communications; establishes connection, defines event handlers, and provides a socket instance to other modules
- **`public/js/chat.js`**: Manages the chat interface, sends/receives messages via socket.io, and displays history
- **`public/js/three-setup.js`**: Initializes Three.js renderer, camera, and scene; provides core rendering functions

#### ECS Core Implementation

- **`public/js/ecs/core.js`**: Defines the base ECS architecture with the following classes:
  - `Entity`: Base game object container
  - `Component`: Data container class
  - `System`: Processing logic class
  - `World`: Central ECS manager that tracks entities and systems

#### Components

- **`public/js/ecs/components.js`**: Base component definitions including:
  - `TransformComponent`: Position, rotation, and scale data
  - `MeshComponent`: Three.js visual representation
  - `RotationComponent`: Rotation animation parameters
  - `PlayerComponent`: Player-specific data

- **`public/js/ecs/inventoryComponents.js`**: Inventory-related components:
  - `ItemComponent`: Properties for items (name, description, ID)
  - `InventoryComponent`: Player inventory with slots management
  - `InteractableComponent`: Defines interaction behavior

#### Entities

- **`public/js/ecs/entities.js`**: Factory functions for creating base entities like:
  - `createCube`: Basic cube entities
  - `createPlayer`: Player entities with controls

- **`public/js/ecs/inventoryEntities.js`**: Factory functions for inventory-related entities:
  - `createItem`: World items that can be picked up
  - `createBasicItem`: Standard pickable items
  - `createDefaultItem`: Default inventory items

#### Systems

- **`public/js/ecs/systems.js`**: Core game systems:
  - `RenderSystem`: Renders entities with mesh components
  - `RotationSystem`: Animates rotating entities
  - `NetworkSyncSystem`: Synchronizes entity states across clients

- **`public/js/ecs/inventorySystem.js`**: Manages inventory interactions:
  - Handles item pickups via raycasting
  - Updates inventory UI
  - Processes drag-and-drop inventory management
  - Communicates with server for inventory actions

### Server-Side Architecture

- **`server/server.js`**: Main server file that:
  - Sets up Express and Socket.io
  - Initializes SQLite database
  - Manages player connections and disconnections
  - Processes chat messages and stores them in the database
  - Handles inventory actions (pickup, drop, move)
  - Maintains world state (items, players)
  - Synchronizes data between clients

### Database Structure

- **`chat.db`**: SQLite database with the following tables:
  - `messages`: Stores chat history
  - `player_inventory`: Stores player inventory items
  - `world_items`: Stores items in the world that can be picked up

## Data Flow Diagram

```
┌─────────────────────────────────────────┐
│                 CLIENT                  │
│                                         │
│  ┌─────────────┐       ┌────────────┐   │
│  │   User      │       │  THREE.js  │   │
│  │ Interaction │───────►   Render   │   │
│  └─────┬───────┘       └────────────┘   │
│        │                                │
│        ▼                                │
│  ┌─────────────┐       ┌────────────┐   │
│  │  ECS World  │◄──────┤   app.js   │   │
│  └─────┬───────┘       └────────────┘   │
│        │                                │
│        ▼                                │
│  ┌─────────────┐       ┌────────────┐   │
│  │  Systems    │◄──────┤  network.js│   │
│  │(Processing) │       └──────┬─────┘   │
│  └─────┬───────┘              │         │
│        │                      │         │
└────────┼──────────────────────┼─────────┘
         │                      │
         │                      │
         ▼                      ▼
┌────────────────────────────────────────┐
│               Socket.io                │
└─────────────────┬────────────────────┬─┘
                  │                    │
                  ▼                    ▼
┌────────────────────────────────────────┐
│                SERVER                  │
│                                        │
│  ┌─────────────┐      ┌─────────────┐  │
│  │  Socket.io  │      │   Express   │  │
│  │  Handlers   │      │    Server   │  │
│  └──────┬──────┘      └─────────────┘  │
│         │                              │
│         ▼                              │
│  ┌─────────────┐      ┌─────────────┐  │
│  │  Game Logic │      │   Static    │  │
│  │  Processing │      │   Files     │  │
│  └──────┬──────┘      └─────────────┘  │
│         │                              │
│         ▼                              │
│  ┌─────────────────────────────────┐   │
│  │            SQLite               │   │
│  │  ┌─────────┐┌────────────────┐  │   │
│  │  │ Messages││Player Inventory│  │   │
│  │  └─────────┘└────────────────┘  │   │
│  │       ┌─────────────┐           │   │
│  │       │  World Items│           │   │
│  │       └─────────────┘           │   │
│  └─────────────────────────────────┘   │
└────────────────────────────────────────┘
```

## Inventory System Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                   │
│                                                                 │
│  ┌───────────────┐    ┌────────────────┐    ┌──────────────┐    │
│  │ Player clicks │    │InteractableComp│    │Socket.io emit│    │
│  │  on an item   ├───►│   onInteract   ├───►│  'pickup'    │    │
│  └───────────────┘    └────────────────┘    └──────┬───────┘    │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER                                   │
│                                                                 │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────┐   │
│  │Process 'pickup'│    │Update DB &     │    │Emit to picker│   │
│  │   request      ├───►│server state    ├───►│'inventory    │   │
│  └────────────────┘    └────────────────┘    │ update'      │   │
│                                              └──────┬───────┘   │
│                                                     │           │
│  ┌────────────────┐                                 │           │
│  │Emit to all     │                                 │           │
│  │'item removed'  │◄────────────────────────────────┘           │
│  └──────┬─────────┘                                             │
└─────────┼─────────────────────────────────────────────────────┬─┘
          │                                                     │
          ▼                                                     ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│         OTHER CLIENTS       │               │          PICKER CLIENT      │
│                             │               │                             │
│  ┌─────────────┐            │               │  ┌─────────────┐            │
│  │Remove item  │            │               │  │Update local │            │
│  │from world   │            │               │  │inventory    │            │
│  └─────────────┘            │               │  └──────┬──────┘            │
│                             │               │         │                   │
│                             │               │         ▼                   │
│                             │               │  ┌─────────────┐            │
│                             │               │  │Update UI    │            │
│                             │               │  │display      │            │
│                             │               │  └─────────────┘            │
└─────────────────────────────┘               └─────────────────────────────┘
```

## Project Structure

```
multiplayer-vibecode/
├── public/                      # Client-side files
│   ├── index.html               # Main HTML page
│   ├── css/                     # CSS styles
│   │   └── style.css            # Main stylesheet
│   ├── js/                      # Client-side JavaScript
│   │   ├── app.js               # Main application entry point
│   │   ├── network.js           # Socket.io communication
│   │   ├── chat.js              # Chat functionality
│   │   ├── three-setup.js       # Three.js initialization
│   │   └── ecs/                 # Entity Component System
│   │       ├── core.js          # Core ECS functionality
│   │       ├── entities.js      # Base entity definitions
│   │       ├── components.js    # Base component definitions
│   │       ├── systems.js       # Core system definitions
│   │       ├── inventoryComponents.js # Inventory components
│   │       ├── inventoryEntities.js   # Inventory entities
│   │       └── inventorySystem.js     # Inventory system
├── server/                      # Server-side code
│   └── server.js                # Express and Socket.io server
├── .env                         # Environment variables
├── package.json                 # Dependencies
├── chat.db                      # SQLite database (created on first run)
├── PLANNING.md                  # Project planning document
├── TASK.md                      # Task tracking
└── README.md                    # This file
```

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript, Three.js
- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.io
- **Database**: SQLite (better-sqlite3)
- **Architecture**: Entity Component System (ECS)

## Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/multiplayer-vibecode.git
   cd multiplayer-vibecode
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Development

For development with automatic server restart:
```
npm run dev
```

## Future Enhancements

- Enhanced player avatars and movement
- Advanced world interaction mechanics
- Expanded inventory system with crafting
- Enhanced physics and collision detection
- User authentication and profiles

## License

MIT
