# Multiplayer Three.js Application

A real-time multiplayer 3D application with Three.js, Socket.io, and a persistent chat system using SQLite.

## Features

- 3D scene with Three.js and Entity Component System (ECS) architecture
- Rotating cube synchronized across all connected clients
- Real-time chat system with persistent message storage
- Connected user awareness
- Inventory system with item pickup and management
- Chat bubbles displayed above player avatars
- Third-person camera system with controlled rotation limits
- Context menu system for player and world interactions
- Player-to-player trading system with item exchange
- RESTful API endpoints for database access and monitoring

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
  - `MovementSystem`: Handles player movement and position updates
  - `NetworkSyncSystem`: Synchronizes entity states across clients

- **`public/js/ecs/inventorySystem.js`**: Manages inventory interactions:
  - Handles item pickups via raycasting
  - Updates inventory UI
  - Processes drag-and-drop inventory management
  - Communicates with server for inventory actions

- **`public/js/ecs/chatBubbleSystem.js`**: Manages chat bubbles:
  - Displays chat messages above player avatars
  - Handles positioning and lifecycle of chat bubbles
  - Provides visual feedback for player communication

- **`public/js/ecs/cameraSystem.js`**: Implements third-person camera:
  - Maintains fixed distance from player while allowing full rotation
  - Follows player movement with smooth damping
  - Enforces vertical rotation limits for better gameplay experience
  - Configures OrbitControls for optimal third-person perspective

- **`public/js/ecs/contextMenuSystem.js`**: Implements right-click context menus:
  - Provides contextual interactions with players, items, and the world
  - Uses raycasting to detect clicked objects
  - Dynamically generates menu options based on interaction target
  - Supports player-to-player interactions like trading

- **`public/js/ecs/playerEntityHelper.js`**: Utility functions for player entities:
  - Updates player entity meshes with entity IDs for raycasting detection
  - Facilitates player interaction through the context menu system

- **`public/js/tradeSystem.js`**: Player-to-player trading functionality:
  - Allows players to request trades with each other
  - Provides UI for offering and accepting items
  - Handles trade negotiation with accept/decline functionality
  - Synchronizes trade state between players in real-time

### Server-Side Architecture

- **`server/server.js`**: Main server file that:
  - Sets up Express and Socket.io
  - Initializes SQLite database
  - Manages player connections and disconnections
  - Processes chat messages and stores them in the database
  - Handles inventory actions (pickup, drop, move)
  - Maintains world state (items, players)
  - Synchronizes data between clients
  - Provides RESTful API endpoints for database access and monitoring

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
multiplayer-chat/
├── public/                      # Client-side files
│   ├── index.html               # Main HTML page
│   ├── css/                     # CSS styles
│   │   └── style.css            # Main stylesheet
│   ├── js/                      # Client-side JavaScript
│   │   ├── app.js               # Main application entry point
│   │   ├── network.js           # Socket.io communication
│   │   ├── chat.js              # Chat system management
│   │   ├── three-setup.js       # Three.js initialization
│   │   ├── contextMenu.js       # Context menu UI management
│   │   ├── tradeSystem.js       # Player-to-player trading functionality
│   │   └── ecs/                 # Entity Component System
│   │       ├── core.js          # ECS core implementation
│   │       ├── components.js    # Component definitions
│   │       ├── entities.js      # Entity factory functions
│   │       ├── systems.js       # System implementations
│   │       ├── cameraSystem.js  # Third-person camera system
│   │       ├── chatBubbleSystem.js # Chat bubble display system
│   │       ├── contextMenuSystem.js # Right-click interaction system
│   │       ├── playerEntityHelper.js # Player entity utility functions
│   │       ├── inventoryComponents.js # Inventory component definitions
│   │       ├── inventoryEntities.js # Inventory entity factories
│   │       └── inventorySystem.js # Inventory management system
├── server/                      # Server-side files
│   └── server.js                # Main server file
├── chat.db                      # SQLite database file
├── package.json                 # Node.js dependencies
├── package-lock.json            # Dependency lock file
├── API.md                       # API documentation
└── README.md                    # Project documentation
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

## API Documentation

The application provides several RESTful API endpoints for database access and monitoring. For detailed information about these endpoints, please refer to the [API.md](API.md) file, which includes:

- Database admin endpoints for messages, inventory, and world items
- Socket.IO event documentation
- Database schema details

## Future Enhancements

- Enhanced player avatars and movement
- Advanced world interaction mechanics
- Expanded inventory system with crafting
- Improved chat bubble system with customization options
- Additional admin tools for server monitoring
- Enhanced physics and collision detection
- User authentication and profiles

## License

MIT
