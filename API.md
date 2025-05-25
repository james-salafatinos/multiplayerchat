# Multiplayer Chat API Documentation

This document outlines the available API endpoints for the multiplayer chat application.

## API Base URL

All API endpoints are prefixed with `/api` (e.g., `/api/admin/db/messages`).

## Database Admin Endpoints

These endpoints provide access to database information and statistics.

### Messages

**Endpoint:** `GET /api/admin/db/messages`

**Description:** Returns all chat messages stored in the database, ordered by timestamp in descending order.

**Response:**
```json
[
  {
    "id": 123,
    "username": "Player-1234",
    "content": "Hello world!",
    "timestamp": "2025-05-23T19:15:00.000Z"
  },
  ...
]
```

### Database Statistics

**Endpoint:** `GET /api/admin/db/stats`

**Description:** Returns statistics about the database, including message count, latest message, database path, and available tables.

**Response:**
```json
{
  "messageCount": 42,
  "latestMessage": {
    "id": 123,
    "username": "Player-1234",
    "content": "Hello world!",
    "timestamp": "2025-05-23T19:15:00.000Z"
  },
  "databasePath": "/path/to/chat.db",
  "tables": [
    { "name": "messages" },
    { "name": "player_inventory" },
    { "name": "world_items" }
  ]
}
```

### Player Inventory (Specific Player)

**Endpoint:** `GET /api/admin/db/inventory/:playerId`

**Description:** Returns the inventory items for a specific player.

**Parameters:**
- `playerId`: The ID of the player (usually the socket ID)

**Response:**
```json
[
  {
    "id": 1,
    "player_id": "socket123",
    "slot_index": 0,
    "item_id": 0,
    "item_name": "Default Item",
    "item_description": "The default item that every player starts with"
  },
  ...
]
```

### All Player Inventories

**Endpoint:** `GET /api/admin/db/inventory`

**Description:** Returns inventory items for all players, ordered by player ID and slot index.

**Response:**
```json
[
  {
    "id": 1,
    "player_id": "socket123",
    "slot_index": 0,
    "item_id": 0,
    "item_name": "Default Item",
    "item_description": "The default item that every player starts with"
  },
  ...
]
```

### World Items

**Endpoint:** `GET /api/admin/db/world-items`

**Description:** Returns all items currently in the game world.

**Response:**
```json
[
  {
    "id": 1,
    "item_uuid": "item-1",
    "item_id": 1,
    "item_name": "Basic Item",
    "item_description": "A basic item that can be picked up",
    "position_x": 2,
    "position_y": 0.15,
    "position_z": 2
  },
  ...
]
```

### Connected Players

**Endpoint:** `GET /api/admin/db/players`

**Description:** Returns information about all currently connected players. This endpoint provides real-time data about players currently connected to the server, including their positions, usernames, and inventory counts.

**Response:**
```json
[
  {
    "id": "socket123",
    "username": "Player-1234",
    "position": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "color": 16777215,
    "inventoryCount": 1
  },
  ...
]
```

**Notes:**
- The `id` field corresponds to the player's socket ID
- `position` contains the player's current 3D coordinates in the game world
- `color` is a numeric representation of the player's color
- `inventoryCount` shows the number of non-null items in the player's inventory

### All Database Tables

**Endpoint:** `GET /api/admin/db/all-tables`

**Description:** Returns all data from all tables in the database. This endpoint provides a complete dump of all data across all tables, which can be useful for backups or administrative purposes.

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-05-25T20:19:31.000Z",
  "tables": ["messages", "player_inventory", "world_items"],
  "data": {
    "messages": [
      {
        "id": 1,
        "username": "Player-1234",
        "content": "Hello world!",
        "timestamp": "2025-05-23T19:15:00.000Z"
      }
    ],
    "player_inventory": [
      {
        "id": 1,
        "player_id": "socket123",
        "slot_index": 0,
        "item_id": 1,
        "item_name": "Sword",
        "item_description": "A sharp sword"
      }
    ],
    "world_items": [
      {
        "id": 1,
        "item_uuid": "item-1",
        "item_id": 1,
        "item_name": "Health Potion",
        "item_description": "Restores 50 health points",
        "position_x": 10.5,
        "position_y": 0,
        "position_z": 15.2
      }
    ]
  }
}
```

**Notes:**
- The response includes a `success` flag indicating if the operation was successful
- `timestamp` shows when the data was retrieved
- `tables` array lists all tables included in the response
- `data` object contains the actual table data, keyed by table name
- If there's an error reading a specific table, that table's entry will contain an error message instead of its data

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "message": "Failed to fetch database tables"
}
```

## Socket.IO Events

The application also uses Socket.IO for real-time communication. These are not REST API endpoints but are documented here for completeness.

### Client to Server Events

- `chat message`: Send a chat message
- `update rotation`: Update object rotation
- `update position`: Update player position
- `inventory update`: Update player inventory (pickup, drop, move items)
- `request inventory`: Request current inventory data

### Server to Client Events

- `players list`: List of other players
- `player joined`: New player joined
- `player inventory`: Player's inventory data
- `user count`: Current user count
- `chat history`: Recent chat messages
- `world items state`: Current state of items in the world
- `chat message`: New chat message
- `update rotation`: Object rotation update
- `player position`: Player position update
- `inventory update`: Inventory update
- `pickup failure`: Failed to pick up an item
- `item removed`: Item removed from world
- `inventory error`: Error updating inventory

## Database Schema

### Messages Table

```sql
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Player Inventory Table

```sql
CREATE TABLE IF NOT EXISTS player_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  UNIQUE(player_id, slot_index)
);
```

### World Items Table

```sql
CREATE TABLE IF NOT EXISTS world_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_uuid TEXT NOT NULL UNIQUE,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  position_z REAL NOT NULL
);
```
