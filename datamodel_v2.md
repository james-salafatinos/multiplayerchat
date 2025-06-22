# MMORPG Data Model (v2)

A pragmatic, RuneScape-inspired schema that balances completeness with extensibility.  It follows an **ECS-flavoured** approach: immutable catalogue tables (definitions), stateful instance tables, and JSONB flex columns for edge-cases.  All IDs are UUID unless otherwise noted; timestamps are `TIMESTAMPTZ`.  Tables are grouped by domain so services can be sharded or re-platformed independently.

---

## Domain Map

1. Accounts & Security  
2. Characters  
3. Skills & Abilities  
4. Items, Inventory & Equipment  
5. World & Environment  
6. NPCs & AI  
7. Combat & Status Effects  
8. Quests & Achievements  
9. Economy & Loot  
10. Social (Guilds, Chat, Friends)  
11. Logging & Analytics

---

## 1. Accounts & Security
```sql
-- Player / staff login credentials
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(32) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_type  VARCHAR(20)  DEFAULT 'player', -- player, moderator, admin
    status        VARCHAR(20)  DEFAULT 'active', -- active, banned, suspended
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    last_login    TIMESTAMPTZ,
    settings      JSONB        DEFAULT '{}'
);

-- Active JWT / session tokens (stateless auth works too)
CREATE TABLE user_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
```

---

## 2. Characters
```sql
CREATE TABLE characters (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    name              VARCHAR(32) UNIQUE NOT NULL,
    gender            VARCHAR(10),
    race              VARCHAR(20) DEFAULT 'human',
    creation_date     TIMESTAMPTZ DEFAULT NOW(),
    last_active       TIMESTAMPTZ,
    play_time_minutes INT    DEFAULT 0,
    deletion_flag     BOOLEAN DEFAULT FALSE,
    home_zone_id      INT REFERENCES zones(id),
    respawn_location_id INT REFERENCES world_locations(id)
);

-- Renderable look stored as simple attributes + flex JSON
CREATE TABLE character_appearance (
    character_id  UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    body_type     SMALLINT,
    hair_style    SMALLINT,
    hair_color    VARCHAR(20),
    skin_color    VARCHAR(20),
    extras        JSONB
);

-- Frequently updated; consider in-memory cache / Redis
CREATE TABLE character_position (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    x  FLOAT NOT NULL,
    y  FLOAT NOT NULL,
    z  FLOAT NOT NULL,
    rot_y FLOAT NOT NULL,
    zone_id  INT REFERENCES zones(id),
    instance_id UUID REFERENCES instances(id),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Skills & Abilities
```sql
-- XP curve & metadata
CREATE TABLE skill_definitions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(32) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    max_level INT DEFAULT 99,
    skill_type VARCHAR(20) -- combat, gathering, crafting
);

CREATE TABLE character_skills (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    skill_id     INT  REFERENCES skill_definitions(id),
    level        INT  DEFAULT 1,
    experience   BIGINT DEFAULT 0,
    PRIMARY KEY (character_id, skill_id)
);

CREATE TABLE ability_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    skill_id INT REFERENCES skill_definitions(id),
    required_level INT,
    cooldown_secs INT,
    resource_cost INT,
    effects JSONB,
    icon VARCHAR(255)
);

CREATE TABLE character_abilities (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    ability_id   INT REFERENCES ability_definitions(id),
    hotbar_slot  SMALLINT,
    PRIMARY KEY (character_id, ability_id)
);
```

---

## 4. Items, Inventory & Equipment
```sql
CREATE TABLE item_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    item_type VARCHAR(32) NOT NULL,  -- weapon, armor, consumable, resource
    subtype   VARCHAR(32),
    rarity    VARCHAR(20) DEFAULT 'common',
    stackable BOOLEAN     DEFAULT FALSE,
    max_stack INT         DEFAULT 1,
    weight    FLOAT       DEFAULT 1,
    level_req INT         DEFAULT 1,
    value     INT         DEFAULT 0,
    equip_slot VARCHAR(32),  -- head, chest, weapon_main
    stats      JSONB,  -- stat modifiers
    effects    JSONB,  -- consumable effects
    icon       VARCHAR(255),
    model      VARCHAR(255)
);

CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,  -- backpack, bank, pouch
    max_slots SMALLINT NOT NULL,
    name VARCHAR(50)
);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES inventories(id) ON DELETE CASCADE,
    slot_index SMALLINT NOT NULL,
    item_def_id INT REFERENCES item_definitions(id),
    quantity INT DEFAULT 1,
    durability FLOAT,
    properties JSONB,
    UNIQUE (inventory_id, slot_index)
);

CREATE TABLE character_equipment (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    slot_key VARCHAR(32),
    item_instance_id UUID REFERENCES inventory_items(id),
    PRIMARY KEY (character_id, slot_key)
);
```

---

## 5. World & Environment
```sql
CREATE TABLE zones (
    id  SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    zone_type VARCHAR(20), -- city, wilderness, dungeon
    min_level INT DEFAULT 1,
    pvp_enabled BOOLEAN DEFAULT FALSE,
    parent_zone_id INT REFERENCES zones(id)
);

CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id INT REFERENCES zones(id),
    owner_character_id UUID,
    difficulty VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE world_locations (
    id SERIAL PRIMARY KEY,
    zone_id INT REFERENCES zones(id),
    name VARCHAR(64),
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    z FLOAT NOT NULL,
    location_type VARCHAR(20)
);

-- Harvestables / ores / trees
CREATE TABLE resource_node_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    resource_type VARCHAR(20),
    required_skill_id INT REFERENCES skill_definitions(id),
    required_level INT DEFAULT 1,
    base_xp INT,
    loot_table_id INT REFERENCES loot_tables(id),
    respawn_seconds INT DEFAULT 60
);

CREATE TABLE resource_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_def_id INT REFERENCES resource_node_definitions(id),
    zone_id INT REFERENCES zones(id),
    x FLOAT, y FLOAT, z FLOAT,
    current_health INT,
    respawns_at TIMESTAMPTZ
);
```

---

## 6. NPCs & AI
```sql
CREATE TABLE npc_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    npc_type VARCHAR(20), -- merchant, quest_giver, enemy
    level INT DEFAULT 1,
    dialogue_tree JSONB,
    vendor_inventory_id INT REFERENCES vendor_inventories(id),
    model VARCHAR(255),
    properties JSONB
);

CREATE TABLE npc_spawns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_def_id INT REFERENCES npc_definitions(id),
    zone_id INT REFERENCES zones(id),
    x FLOAT, y FLOAT, z FLOAT,
    respawn_seconds INT DEFAULT 60
);
```

---

## 7. Combat & Status Effects
```sql
CREATE TABLE status_effect_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32),
    description TEXT,
    max_stacks SMALLINT DEFAULT 1,
    duration_seconds INT,
    tick_rate_seconds INT,
    effects JSONB -- stat changes each tick or on apply
);

CREATE TABLE character_status_effects (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    effect_id INT REFERENCES status_effect_definitions(id),
    stacks SMALLINT DEFAULT 1,
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (character_id, effect_id)
);

-- Minimal combat journal for replays / analytics
CREATE TABLE combat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID,
    defender_id UUID,
    ability_id INT,
    damage INT,
    critical BOOLEAN,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Quests & Achievements
```sql
CREATE TABLE quest_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description TEXT,
    recommended_level INT,
    requirements JSONB,
    rewards JSONB
);

CREATE TABLE character_quests (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    quest_id INT REFERENCES quest_definitions(id),
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed
    progress JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (character_id, quest_id)
);

CREATE TABLE achievement_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64),
    description TEXT,
    requirement JSONB,
    points INT DEFAULT 0
);

CREATE TABLE character_achievements (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    achievement_id INT REFERENCES achievement_definitions(id),
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (character_id, achievement_id)
);
```

---

## 9. Economy & Loot
```sql
-- Drop tables for monsters / nodes
CREATE TABLE loot_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64)
);

CREATE TABLE loot_table_items (
    loot_table_id INT REFERENCES loot_tables(id) ON DELETE CASCADE,
    item_def_id INT REFERENCES item_definitions(id),
    min_qty SMALLINT DEFAULT 1,
    max_qty SMALLINT DEFAULT 1,
    weight  INT DEFAULT 1,
    PRIMARY KEY (loot_table_id, item_def_id)
);

-- Player-to-player trade (simple)
CREATE TABLE trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_character_id UUID REFERENCES characters(id),
    buyer_character_id  UUID REFERENCES characters(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_items (
    trade_id UUID REFERENCES trade_offers(id) ON DELETE CASCADE,
    item_instance_id UUID REFERENCES inventory_items(id),
    offered_by_seller BOOLEAN,
    PRIMARY KEY (trade_id, item_instance_id)
);
```

---

## 10. Social
```sql
CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) UNIQUE NOT NULL,
    tag  VARCHAR(5) UNIQUE NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW(),
    motd TEXT
);

CREATE TABLE guild_members (
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    rank VARCHAR(20) DEFAULT 'member', -- leader, officer, member
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (guild_id, character_id)
);

CREATE TABLE friend_relations (
    character_id UUID,
    friend_id    UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (character_id, friend_id)
);

CREATE TABLE chat_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32), -- global, trade, guild
    scope VARCHAR(20) -- global, zone, guild
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id INT REFERENCES chat_channels(id),
    sender_character_id UUID REFERENCES characters(id),
    message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. Logging & Analytics
```sql
CREATE TABLE gameplay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID,
    event_type VARCHAR(32),
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Index & Performance Notes
* **High-write tables** (`character_position`, chat, combat_logs) may sit in a time-series DB or in-memory store.
* Foreign keys are kept for data integrity; at scale some hot paths may denormalise.
* JSONB enables rapid iteration without migrations but be vigilant with GIN indexes.

### Extending the Model
Add new skills, items, or effects by inserting into their definition tables— the instance tables remain untouched.  This mirrors RuneScape’s live-ops pipeline while staying RDBMS-friendly.
