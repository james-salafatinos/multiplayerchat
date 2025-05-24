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
- RESTful API endpoints for database access and monitoring (including detailed admin views for inventories, world items, and connected players)

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
  - Works in conjunction with `public/js/contextMenu.js` for UI management.

- **`public/js/ecs/playerEntityHelper.js`**: Utility functions for player entities:
  - Updates player entity meshes with entity IDs for raycasting detection
  - Facilitates player interaction through the context menu system
  - Synchronizes trade state between players in real-time

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
  - Manages player-to-player trade requests, state transitions, and item exchanges.
  - Maintains world state (items, players)
  - Synchronizes data between clients
  - Provides RESTful API endpoints for database access and monitoring, including new endpoints for detailed views of player inventories, world items, and connected player states (documented in `API.md`).

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

## Trade System Data Flow

```mermaid
graph TD
    subgraph Initiator Client (Player A)
        A1[Right-clicks Player B, Selects "Trade" via ContextMenuSystem]
        A2[Emits 'trade request' to Server for Player B]
        A3[Receives 'trade request response' from Server]
        A4[If accepted, opens trade window (tradeSystem.js)]
        A5[Offers/Accepts items, Emits 'trade update'/'trade accept' to Server]
    end

    subgraph Target Client (Player B)
        B1[Receives 'trade request' from Server]
        B2[Displays trade request UI (tradeSystem.js)]
        B3[Accepts/Declines, Emits 'trade request response' to Server]
        B4[Receives 'trade update'/'trade accept' from Server]
        B5[Updates trade window UI, Offers/Accepts items, Emits 'trade update'/'trade accept' to Server]
    end

    subgraph SERVER
        S1[Receives 'trade request' from Player A]
        S2[Forwards 'trade request' to Player B]
        S3[Receives 'trade request response' from Player B]
        S4[Forwards 'trade request response' to Player A]
        S5[Receives 'trade update'/'trade accept' from A or B]
        S6[Forwards 'trade update'/'trade accept' to other player]
        S7[If both accept: Validates trade, Updates DB & player inventories]
        S8[Emits 'inventory update' to both players]
        S9[Emits 'trade complete/cancelled' (optional)]
    end

    A1 --> A2
    A2 --> S1
    S1 --> S2
    S2 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> S3
    S3 --> S4
    S4 --> A3
    A3 -- If Accepted --> A4
    A4 --> A5
    A5 --> S5
    S5 --> S6
    S6 --> B4
    B4 --> B5
    B5 --> S5 # Cycle for updates/accepts

    S5 -- Both Accepted --> S7
    S7 --> S8
    S8 --> A3 # Actually to a new state for inventory update
    S8 --> B1 # Actually to a new state for inventory update
    S7 --> S9
    S9 --> A3
    S9 --> B1
```

## Project Structure

```
multiplayer-chat/
├── public/
│   ├── css/
│   │   ├── style.css            # Main stylesheet
│   │   ├── context-menu.css     # Styles for the context menu
│   │   ├── trade-window.css     # Styles for the trade window
│   ├── js/
│   │   ├── app.js               # Main application entry point
│   │   ├── network.js           # Socket.io communication
│   │   ├── chat.js              # Chat system management
│   │   ├── three-setup.js       # Three.js initialization
│   │   ├── contextMenu.js       # Context menu UI and management
│   │   ├── tradeSystem.js       # Player-to-player trade UI and logic
│   │   └── ecs/
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
│   ├── assets/                  # Static assets (textures, models, etc.)
│   └── index.html               # Main HTML page
├── server/
│   └── server.js              # Server-side application logic
├── chat.db                    # SQLite database file
├── API.md                     # Detailed API documentation
├── README.md                  # This file
├── package.json
├── package-lock.json
└── todo.md                    # Task tracking and future ideas
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
