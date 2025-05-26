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
    "color": "#FF0000",
    "inventoryCount": 1
  },
  ...
]
```

**Notes:**
- The `id` field corresponds to the player's socket ID
- `position` contains the player's current 3D coordinates in the game world
- `color` is the player's chosen avatar color, typically in hex format (e.g., '#FF0000').
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

#### `sendMessage`
- **Event:** `sendMessage`
- **Payload:** `{ "content": "Hello world!" }`
- **Description:** Sent by the client when a user submits a chat message.

#### `pickupItem`
- **Event:** `pickupItem`
- **Payload:** `{ "itemId": "item-uuid-123" }`
- **Description:** Sent when a player attempts to pick up an item from the world.

#### `dropItem`
- **Event:** `dropItem`
- **Payload:** `{ "slotIndex": 0, "item": { ... } }`
- **Description:** Sent when a player drops an item from their inventory into the world.

#### `moveItemInInventory`
- **Event:** `moveItemInInventory`
- **Payload:** `{ "fromSlot": 0, "toSlot": 1 }`
- **Description:** Sent when a player moves an item within their inventory.

#### `playerMovement`
- **Event:** `playerMovement`
- **Payload:** `{ "position": { "x": 1, "y": 0, "z": 1 }, "rotation": { "x": 0, "y": 0, "z": 0 } }`
- **Description:** Sent periodically by the client to update the server with the player's current position and rotation.

#### `tradeRequest`
- **Event:** `tradeRequest`
- **Payload:** `{ "targetPlayerId": "socketID_B" }`
- **Description:** Initiates a trade with another player.

#### `tradeResponse`
- **Event:** `tradeResponse`
- **Payload:** `{ "tradeId": "uuid", "accepted": true/false }`
- **Description:** Player's response to a trade request.

#### `tradeUpdateItems`
- **Event:** `tradeUpdateItems`
- **Payload:** `{ "tradeId": "uuid", "itemsOffered": [{...}] }`
- **Description:** Updates items offered in an ongoing trade.

#### `tradeAccept`
- **Event:** `tradeAccept`
- **Payload:** `{ "tradeId": "uuid" }`
- **Description:** Player accepts the current state of the trade.

#### `tradeCancel`
- **Event:** `tradeCancel`
- **Payload:** `{ "tradeId": "uuid" }`
- **Description:** Player cancels the trade.

#### `updatePlayerColor`
- **Event:** `updatePlayerColor`
- **Payload:** `{ "color": "#RRGGBB" }` (string: hex color code, e.g., "#FF0000")
- **Description:** Sent by the client when the player changes their avatar color. The server validates, persists, and broadcasts the change.

### Server to Client Events

#### `chatHistory`
- **Event:** `chatHistory`
- **Payload:** `[{ "username": "Player-1234", "content": "Old message", "timestamp": "..." }, ...]`
- **Description:** Sent to a newly connected client, providing recent chat history.

#### `newMessage`
- **Event:** `newMessage`
- **Payload:** `{ "username": "Player-1234", "content": "New message!", "timestamp": "..." }`
- **Description:** Broadcast to all clients when a new chat message is sent.

#### `userConnected`
- **Event:** `userConnected`
- **Payload:** `{ "username": "Player-5678", "id": "socketID", "color": "#RRGGBB" }`
- **Description:** Broadcast when a new user connects, includes their chosen color.

#### `userDisconnected`
- **Event:** `userDisconnected`
- **Payload:** `{ "username": "Player-1234", "id": "socketID" }`
- **Description:** Broadcast when a user disconnects.

#### `inventoryUpdate`
- **Event:** `inventoryUpdate`
- **Payload:** `[{ "slot_index": 0, "item": { ... } }, ...]`
- **Description:** Sent to a client to update their inventory, e.g., after picking up or dropping an item.

#### `worldItemsUpdate`
- **Event:** `worldItemsUpdate`
- **Payload:** `[{ "item_uuid": "...", "item_id": ..., "position": {...} }, ...]`
- **Description:** Sent to clients to update the state of items in the world.

#### `itemPickedUp`
- **Event:** `itemPickedUp`
- **Payload:** `{ "itemId": "item-uuid-123" }`
- **Description:** Confirmation to the picker and broadcast to others that an item was removed from the world.

#### `itemDropped`
- **Event:** `itemDropped`
- **Payload:** `{ "item_uuid": "...", "item_id": ..., "position": {...} }`
- **Description:** Broadcast when an item is added to the world.

#### `playerData`
- **Event:** `playerData`
- **Payload:** `{ "id": "socketID", "username": "Player-1234", "position": { "x": 0, "y": 0, "z": 0 }, "color": "#RRGGBB" }`
- **Description:** Sent to a client when they connect. Contains essential data about the player, including their ID, username, position, and color.

#### `allPlayers`
- **Event:** `allPlayers`
- **Payload:** `[{ "id": "socketID", "username": "Player-1234", "position": { "x": 0, "y": 0, "z": 0 }, "color": "#RRGGBB" }, ...]`
- **Description:** Sent to a newly connected client, providing data for all other currently connected players, including their ID, username, position, and color.

#### `playerMoved`
- **Event:** `playerMoved`
- **Payload:** `{ "id": "socketID", "position": { "x": 1, "y": 0, "z": 1 }, "rotation": { "x": 0, "y": 0, "z": 0 } }`
- **Description:** Broadcast to other clients when a player moves.

#### `tradeStateUpdate`
- **Event:** `tradeStateUpdate`
- **Payload:** `{ "tradeId": "uuid", "status": "requested/accepted/declined/updated/completed/cancelled", "initiatorId": "...", "receiverId": "...", "initiatorItems": [...], "receiverItems": [...] }`
- **Description:** Sent to players involved in a trade to update its state.

#### `playerColorUpdated`
- **Event:** `playerColorUpdated`
- **Payload:** `{ "playerId": "socketID", "color": "#RRGGBB" }` (string: hex color code)
- **Description:** Broadcast by the server to all clients when any player's color has been updated.

## Error Handling
{{ ... }}

## Database Schema

This section outlines the SQL schema for the tables used by the application.

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
  player_id TEXT NOT NULL, -- Corresponds to socket ID
  slot_index INTEGER NOT NULL,
  item_id INTEGER, -- Can be NULL if slot is empty
  item_name TEXT,
  item_description TEXT,
  UNIQUE(player_id, slot_index)
);
```

### World Items Table

```sql
CREATE TABLE IF NOT EXISTS world_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_uuid TEXT NOT NULL UNIQUE, -- Unique identifier for the item instance in the world
  item_id INTEGER NOT NULL, -- Type of item
  item_name TEXT NOT NULL,
  item_description TEXT,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  position_z REAL NOT NULL
);
```
