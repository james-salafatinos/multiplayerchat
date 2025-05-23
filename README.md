# Multiplayer Three.js Application

A real-time multiplayer 3D application with Three.js, Socket.io, and a persistent chat system using SQLite.

## Features

- 3D scene with Three.js and Entity Component System (ECS) architecture
- Rotating cube synchronized across all connected clients
- Real-time chat system with persistent message storage
- Connected user awareness

## Project Structure

```
multiplayer-vibecode/
├── public/               # Client-side files
│   ├── index.html        # Main HTML page
│   ├── css/              # CSS styles
│   │   └── style.css     # Main stylesheet
│   ├── js/               # Client-side JavaScript
│   │   ├── app.js        # Main application entry point
│   │   ├── network.js    # Socket.io communication
│   │   ├── chat.js       # Chat functionality
│   │   ├── three-setup.js # Three.js initialization
│   │   └── ecs/          # Entity Component System
│   │       ├── core.js   # Core ECS functionality
│   │       ├── entities.js # Entity definitions
│   │       ├── components.js # Component definitions
│   │       └── systems.js # System definitions
├── server/               # Server-side code
│   └── server.js         # Express and Socket.io server
├── .env                  # Environment variables
├── package.json          # Dependencies
├── chat.db               # SQLite database (created on first run)
├── PLANNING.md           # Project planning document
├── TASK.md               # Task tracking
└── README.md             # This file
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

## Entity Component System (ECS)

This project uses an Entity Component System architecture for the 3D scene:

- **Entities**: Base game objects (e.g., cube)
- **Components**: Data containers attached to entities (position, rotation, mesh)
- **Systems**: Logic that processes entities with specific components (render, rotation)

## Future Enhancements

- Player avatars and movement
- World interaction mechanics
- Inventory system
- Enhanced physics
- User authentication

## License

MIT
