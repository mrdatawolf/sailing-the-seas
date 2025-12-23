# Far East Trader – Game Design & Tech Spec

This document defines the initial design and technical foundations for **Far East Trader**, a turn‑based trading game built with **Vite + React (frontend)** and **Express + SQLite (backend)**, starting as a single‑player, server‑authoritative experience with a roadmap to an asynchronous shared world.

The primary audience of this document is another AI assistant or developer that will implement the game.

---

## 1. High-level vision

**Premise:**  
You are a 17th‑century trader operating in the Far East. You start with a single modest ship and a small amount of money. By buying and selling goods between ports, managing risk (storms, pirates, politics), and choosing whether to remain a respectable merchant or embrace piracy, you grow your fleet and influence.

**Key pillars:**

- **Semi‑historical Far East trade (1600s):**  
  Initially focused on Chinese and nearby ports, later expanding to additional trade zones (Japan, Southeast Asia, European colonial ports, etc.) via unlockable regions with new rules/factions.
- **Turn‑based trading:**  
  Each action (traveling, trading, events) advances the game by discrete turns (e.g., days or “voyages”).
- **Risk and choice between ports:**  
  Travel legs can trigger random events: typhoons, pirates, merchants, or other opportunities/threats.
- **Moral gradient:**  
  Players may act as merchants, pirates, or something in between. Choices influence reputation, port access, prices, and NPC hostility.
- **Fleet management:**  
  Players can own multiple ships, upgrade them, and apply upgrades across the fleet (cost scales with number and type of ships).
- **Shared world roadmap:**  
  Initially single player, but with a world state (economy, events) that can eventually be shared asynchronously between multiple players.

---

## 2. Core gameplay loop

### 2.1 Player loop (MVP)

1. **Start game:**
   - Receive initial ship (basic cargo capacity, minimal armament).
   - Receive starting funds.
   - Spawn at a starting Chinese port (e.g., **Guangzhou/Canton**).

2. **At port:**
   - View:
     - Current funds.
     - Fleet (ships, stats, condition).
     - Port market (available goods, quantities, buy/sell prices).
     - Reputation status with local authorities and factions.
   - Choose actions:
     - Buy/sell goods.
     - Repair/upgrade ships (when available).
     - Hire crew (future feature).
     - Take on loans or contracts (future feature).
     - Choose a destination port.

3. **Travel phase (turn):**
   - Player confirms departure and destination.
   - Game:
     - Advances time by 1 “voyage turn”.
     - Rolls for travel events based on:
       - Route risk profile.
       - Player reputation.
       - Cargo type (e.g., contraband).
       - Ship stats (speed, durability, armament, crew).
     - If an event occurs:
       - Trigger event UI (typhoon, pirates, merchant encounter, etc.).
       - For pirate/merchant encounters, optionally trigger light tactical minigame.
   - Resolve event outcomes (losses, gains, reputation changes).

4. **Arrival at destination port:**
   - Update port stocks and prices based on player trade and global economy.
   - Present updated port screen, allowing next trade cycle.

5. **Progression:**
   - Accumulate wealth to:
     - Purchase additional ships.
     - Upgrade fleet (armor, guns, cargo capacity, speed).
   - Unlock new trade zones when certain wealth/reputation thresholds are met.
   - Reputation and choices influence:
     - Port access (closed to known pirates, or bribe needed).
     - Prices (surcharges, discounts).
     - Event likelihoods (more pirate hunters if you’re notorious).

---

## 3. World and setting

### 3.1 Geographic scope (Phase 1)

- **Region:**  
  Far East, with focus on China and major regional ports relevant to 1600s trade.
- **Ports (initial examples):**
  - **Canton (Guangzhou)** – Primary Chinese export port.
  - **Macau** – Portuguese enclave, special rules later.
  - **Nagasaki** – Gateway to Japan (potentially locked early game).
  - **Manila** – Spanish presence and silver trade (future unlock).
  - **Batavia (Jakarta)** – Dutch VOC hub (future unlock).
  - For MVP, we can start with 3–5 ports centered on China and expand over time.

### 3.2 Port attributes

Each port has:

- **Static attributes:**
  - `id`
  - `name`
  - `region` (e.g., China, Japan, SE Asia)
  - `faction` (e.g., Ming/Qing China, Portuguese, Dutch, etc.)
  - `base_security_level` (affects pirates, smuggling risk)
  - `connected_ports` (graph edges defining legal routes)
- **Economic attributes:**
  - `base_prices` per good.
  - `stock_levels` per good.
  - `stock_capacity` per good (for supply/demand modeling).
  - `import_preferences` and `export_specialties` (modifiers to price and stock behavior).

### 3.3 Trade zones (future expansion)

- **Concept:**  
  “Zones” such as *South China Sea*, *Sea of Japan*, *Indian Ocean*, each with:
  - Distinct goods, rules, and factions.
  - Unlock conditions (wealth, missions, reputation).
  - Zone-specific events (e.g., monsoon patterns, colonial conflicts).
- For MVP, implement:
  - **Zone 1:** “South China Coast” with several Chinese and nearby ports.
  - Provide clear extension points for additional zones.

---

## 4. Economy and goods

### 4.1 Goods (initial set)

Start with the following goods, but design the system to allow easy expansion:

1. **Tea**
2. **Silk**
3. **Spices**
4. **Porcelain**
5. **Opium**
6. **Silver**

Each good has:

- `id`
- `name`
- `base_price`
- `volume_per_unit` (how much cargo space it takes)
- `legal_status` per faction/port (normal, taxed, contraband, banned)
- `volatility` (how sensitive price is to supply/demand changes)
- `category` (for future events/policies, e.g., “luxury”, “staple”, “contraband”)

### 4.2 Price and stock dynamics (MVP)

**MVP behavior:**

- Each port has:
  - `stock[good_id]` (current units in stock).
  - `stock_capacity[good_id]` (max theoretical stock).
  - `base_price[good_id]`.
- Price function (simple example):

  - Let:
    - \( s = \) current stock.
    - \( C = \) stock capacity.
    - \( P_0 = \) base price.

  - Define a stock ratio:
    

\[
    r = \frac{s}{C}
    \]



  - Price multiplier:
    

\[
    m = 1 + \alpha \cdot (0.5 - r)
    \]


    where \( \alpha \) is a tunable parameter (e.g., 1.0).

  - Final price:
    

\[
    P = \text{clamp}(P_0 \cdot m, P_{\min}, P_{\max})
    \]



- **Player trades** adjust `stock[good_id]` directly and thus influence price.

**Design for future complexity:**

- Allow hook for:
  - Interdependent goods (e.g., silver demand drives prices of Chinese exports).
  - World events modifying:
    - `base_price` temporarily.
    - `stock_capacity` (harvest failure, blockades).
  - Zone‑level modifiers (e.g., wars, trade embargoes).

---

## 5. Fleet, ships, and combat

### 5.1 Ship model

Each ship has:

- `id`
- `owner_player_id`
- `name`
- `type` (e.g., junk, galley, frigate — can be abstract at first)
- **Stats:**
  - `max_cargo`
  - `speed`
  - `hull_strength`
  - `current_hull`
  - `guns`
  - `crew` (abstracted for MVP)
- **Upgrades:**
  - `armor_level`
  - `sail_rigging_level`
  - `cargo_mods_level`
  - `gun_mods_level`

For MVP, types can be simplified to a few tiers:

- Small junk (starter)
- Medium trade ship
- Large war/trade ship

### 5.2 Fleet-level upgrades

- Upgrades can be applied **en masse** to the fleet:
  - Mechanically, this can be modeled as:
    - A **fleet upgrade** level (e.g., “Armor Level 2”) that applies to all ships.
    - Cost scales with:
      - Number of ships.
      - Possibly ship sizes/types.
- Effective ship stats become:
  - `base_ship_stat + fleet_upgrade_bonus`.

### 5.3 Travel risk model

When traveling from port A to port B:

- Determine **route risk profile** based on:
  - Baseline route risk (predefined per edge).
  - Player reputation (pirate/merchant).
  - Current global events.
  - Fleet stats (higher speed/visibility etc. may modify risk).

- Roll for events (e.g.):
  - No event.
  - Typhoon.
  - Pirate attack.
  - Encounter with other merchants.
  - Naval patrol / customs inspection.

### 5.4 Tactical minigame (lightweight)

Goals: **fast, low‑friction, turn‑based.** No complex UI required initially.

**MVP concept (pirate/merchant encounter):**

- Abstract combat into a small number of rounds:
  1. Show encounter summary:
     - Attacker type (pirate, navy, other merchant).
     - Relative strength (weak/roughly equal/strong).
     - Immediate options:
       - Attempt escape.
       - Accept combat.
       - If you’re the aggressor: Attempt to board/loot.
  2. If combat:
     - Resolve via a few RNG‑based rolls affected by:
       - Fleet guns.
       - Hull strength.
       - Speed.
       - Reputation modifiers (pirates may be more cautious against notorious players).
     - Possible outcomes:
       - Minor damage (repair cost).
       - Heavy damage (lose ship(s)).
       - Loot gained / cargo stolen.
       - Reputation changes.
  3. If escape:
     - Success chances based on speed vs opponent.
     - On failure, forced into combat with penalty.

This can be implemented initially as a backend simulation returning a structured result for the frontend to display.

---

## 6. Reputation and factions

### 6.1 Reputation dimensions

MVP: at least two key axes:

1. **Lawful vs Pirate reputation** (global or per faction).
2. **Faction reputation**:
   - Per major faction (e.g., Chinese authorities, Portuguese, Dutch, Japanese).
   - Can be aggregated later into:
     - Access level.
     - Price modifiers.
     - Event weights.

### 6.2 Effects of reputation

- **Port access:**
  - Ports may:
    - Deny entry.
    - Allow entry with extra tax/bribe.
    - Offer special deals to favored traders.

- **Prices:**
  - Markups or discounts based on faction reputation.

- **Event likelihood:**
  - High pirate rep:
    - More encounters with navy and bounty hunters.
    - Friendly pirate encounters or opportunities.
  - High lawful/trusted rep:
    - Better contracts (future).
    - Protection from certain attacks in some waters.

- **Player choices:**
  - Attacking merchants, smuggling contraband, or defying authorities raises pirate reputation and lowers lawful/faction rep.
  - Paying taxes, honoring deals, and helping authorities raise lawful/faction rep.

---

## 7. Shared world roadmap (asynchronous)

Initial version: **single player** with a **persisted global world**.

### 7.1 Persistence

- Use **SQLite** as the backing store for:
  - Ports and their evolving stock/price state.
  - Persistent player records.
  - World events log (for debugging and later features).
- World is intended to **persist indefinitely**, not reset, unless intentionally wiped for major patches.

### 7.2 Asynchronous shared world (future)

Design with these considerations:

- **Server-authoritative state:**
  - All economic and world updates happen on the server through API routes.
- **Shared economy:**
  - Multiple players’ trades affect port stock and prices.
  - Events can be global or local, affecting all players.
- **No real-time co-presence initially:**
  - Players don’t need to see each other in real-time.
  - They interact indirectly via:
    - Market changes.
    - Possibly shared world events or leaderboards.

---

## 8. Technical architecture

### 8.1 Stack choices

- **Frontend framework:** Vite + React
- **Backend framework:** Express.js with API routes
- **Database:** SQLite via better-sqlite3 (synchronous)
- **Authority:** Server-authoritative game logic; clients are UI only
- **Communication:** All frontend/backend communication via REST API calls

**Rationale for stack change from Next.js:**
- SQLite database requires a persistent server process (better-sqlite3 is synchronous)
- No need for SSR/SSG features that Next.js provides
- Clearer separation between frontend and backend
- Simpler development workflow with separate client/server directories

### 8.2 High-level components

1. **Frontend (Vite + React):**
   - React components with Context API for state management (GameContext)
   - Component structure:
     - `PlayerCreation` – initial player setup
     - `PlayerStatusBar` – fixed header showing money, cargo, location, reputation, ships
     - `PortScreen` – three-column layout for port interactions
     - `TravelScreen` – event resolution during voyages
     - `FleetSidebar` – slide-out panel (left) showing detailed ship stats
     - `TravelSidebar` – slide-out panel (right) showing destination options
     - `PortInfoPanel` – historical/flavor information about current port
     - `FleetVisualization` – pixel art harbor scene with ship representations
   - API service layer (`services/api.js`) for all backend communication

2. **API routes (Express.js):**
   - `/api/player` – create/load player state
   - `/api/ports` – get current port info and market data
   - `/api/trade` – buy/sell goods
   - `/api/travel` – initiate/resolve travel between ports
   - `/api/fleet` – manage ships and upgrades (future)
   - `/api/events` – optional route if events need separate querying (future)

3. **Database layer:**
   - SQLite via better-sqlite3 (direct queries)
   - Schema initialization in `server/src/db/schema.js`
   - Seed data in `server/src/db/seed.js`

### 8.3 Data model sketch (tables)

**Players**

- `id`
- `name`
- `created_at`
- `current_port_id`
- `money`
- `lawful_reputation`
- `pirate_reputation`
- `faction_reputation_json` (or separate table)

**Ships**

- `id`
- `player_id`
- `name`
- `type`
- `max_cargo`
- `speed`
- `hull_strength`
- `current_hull`
- `guns`
- `armor_level`
- `sail_rigging_level`
- `cargo_mods_level`
- `gun_mods_level`

**Ports**

- `id`
- `name`
- `region`
- `faction`
- `base_security_level`
- `connected_ports_json` (or separate `routes` table)

**PortGoods**

- `id`
- `port_id`
- `good_id`
- `stock`
- `stock_capacity`
- `base_price`

**Goods**

- `id`
- `name`
- `base_price`
- `volume_per_unit`
- `legal_status_json`
- `volatility`
- `category`

**PlayerCargo**

- `id`
- `player_id`
- `ship_id` (optional; per-ship cargo or fleet-wide)
- `good_id`
- `quantity`

**WorldEvents** (for future use and debugging)

- `id`
- `type`
- `payload_json`
- `created_at`

---

## 9. API design (MVP)

### 9.1 `/api/player`

- **POST `/api/player/create`**
  - Input: `{ name: string }`
  - Behavior:
    - Create new player with starter ship, starting money, default reputations.
  - Output:
    - Player state (includes fleet and current port).

- **GET `/api/player/me`**
  - Input: (auth or player token TBD)
  - Output:
    - Full player state (port, money, fleet, cargo, reputations).

### 9.2 `/api/ports`

- **GET `/api/ports/:id`**
  - Input:
    - `id` – port ID.
  - Output:
    - Port info and current market (`goods` with `stock` and computed price).

### 9.3 `/api/trade`

- **POST `/api/trade/buy`**
  - Input:
    - `player_id`
    - `port_id`
    - `ship_id` (or fleet target)
    - `good_id`
    - `quantity`
  - Behavior:
    - Validate player is at port.
    - Calculate current price.
    - Check funds and cargo capacity.
    - Deduct money, increase cargo.
    - Decrease port stock, update port stock in DB.

- **POST `/api/trade/sell`**
  - Input similar to buy.
  - Behavior:
    - Validate cargo, adjust stock and money.

### 9.4 `/api/travel`

- **POST `/api/travel`**
  - Input:
    - `player_id`
    - `origin_port_id`
    - `destination_port_id`
  - Behavior:
    - Validate that player is at origin.
    - Validate route exists.
    - Roll for travel event.
    - If event occurs:
      - Simulate event.
      - Return event details and updated player state.
    - Move player to destination if not blocked by event.
    - Update global/world state as needed.

- Output:
  - `{ playerState, travelResult, event? }`

### 9.5 `/api/fleet`

- **POST `/api/fleet/upgrade`**
  - Input:
    - `player_id`
    - `upgrade_type` (e.g., armor, guns)
    - `level_delta` (usually +1)
  - Behavior:
    - Compute cost based on fleet size and current level.
    - Deduct money.
    - Adjust all relevant ship stats or record a fleet-wide upgrade level.
  - Output:
    - Updated `playerState`.

---

## 10. Frontend UX (minimal UI)

### 10.1 Core screens (IMPLEMENTED)

**Layout structure:**
- **Fixed header** (PlayerStatusBar): Always visible at top, showing money (gold color), cargo capacity, current location, lawful reputation (green), pirate reputation (red), total ships
- **Slide-out sidebars:**
  - Left sidebar (⚓ button): Fleet details with ship cards showing hull status, damage warnings, upgrade levels
  - Right sidebar (🧭 button): Travel destinations with region, faction, security level info
- **Main content area:** Changes based on screen (port vs travel)

**Port screen (three-column layout):**
1. **Left panel (PortInfoPanel):**
   - Historical/flavor information about the port
   - Current weather (dynamically displayed)
   - Climate, population, culture, industry, notable facts
   - Port-specific data for all ports (Canton, Macau, Hong Kong, Manila, Nagasaki)

2. **Center panel (market):**
   - Port name, region, faction, security level
   - Market table with goods showing:
     - Good name and category
     - Stock / stock capacity
     - Current price (dynamically calculated)
     - Player's cargo quantity for that good
     - Buy/sell buttons (disabled when appropriate)
   - Trade success/error messages
   - Buy/sell uses prompt() for quantity input (simple MVP approach)

3. **Right panel (FleetVisualization):**
   - Pixel art harbor scene with background (sky, water, dock)
   - Animated ships with:
     - Sails (multiple sail elements)
     - Hull (with damage states: normal, damaged, critical)
     - Waves (animated wave effects)
     - Bobbing animation
     - Ship name tags
     - Status indicators (⚠️ for damaged, 🔥 for critical)
   - Fleet summary showing total ships, total guns, total cargo capacity

**Travel / event screen:**
- Display:
  - "Traveling from X to Y…"
  - Event summary (storm, pirates, merchant, patrol, or no event)
  - Event details and outcomes
- Result summary (damage taken, cargo lost/gained, reputation changes)
- Continue button to return to port

**UI styling notes:**
- CSS Grid for three-column layout: `300px 1fr 300px`
- Max-width: 1400px centered layout
- Pixel art CSS with keyframe animations
- Sidebar transforms for slide-in/out effects
- Category-based color coding for goods
- Responsive breakpoints for smaller screens

---

## 11. Extensibility and future features

- **Contracts and missions:**  
  Deliver cargo between ports under time/condition constraints.
- **Loans and debt:**  
  Financial risk/reward mechanics.
- **Crew and morale:**  
  Impact performance in combat and events.
- **Deeper faction politics:**  
  Quests/events that shift reputation and unlock special routes or goods.
- **More complex economic models:**  
  - Cross‑good relationships (e.g., silver and Chinese exports).
  - Zone-wide events (wars, embargoes, famines).
- **Unlockable trade zones:**  
  New ports and mechanics as the player progresses.

---

## 12. Implementation priorities (MVP)

### 12.1 Completed features

1. ✅ **Database schema & Vite + Express scaffold**
   - SQLite schema with all core tables (players, ships, ports, goods, port_goods, player_cargo, world_events)
   - Seed data: 6 goods (Tea, Silk, Spices, Porcelain, Opium, Silver)
   - Seed data: 5 ports (Canton, Macau, Hong Kong, Manila, Nagasaki)

2. ✅ **Player creation and loading**
   - POST `/api/player/create` - creates player with starting ship "Lucky Dragon"
   - GET `/api/player/:id` - returns complete player state
   - LocalStorage persistence of playerId in frontend

3. ✅ **Ports and goods**
   - GET `/api/ports` - lists all ports
   - GET `/api/ports/:id` - returns port with market data
   - Dynamic price calculation based on supply/demand formula from spec

4. ✅ **Core game loop**
   - Port view API fully functional
   - Trade endpoints (POST `/api/trade/buy`, POST `/api/trade/sell`)
   - Travel endpoint with event generation (POST `/api/travel`)
   - Database transactions for atomic operations

5. ✅ **Event resolution**
   - Four event types: storm (damage), pirates (combat), merchant (opportunity), patrol (inspection)
   - Simple combat resolution based on ship guns vs pirate strength
   - Event outcomes affect ship hull, cargo, money, and reputation

6. ✅ **Frontend UI**
   - GameContext for state management
   - PlayerCreation component
   - PlayerStatusBar (fixed header)
   - FleetSidebar and TravelSidebar (slide-out panels)
   - PortScreen with three-column layout (info, market, fleet visualization)
   - TravelScreen with event display
   - Pixel art fleet visualization with animations

### 12.2 Next priority: Quartermaster system

See Section 14 below for detailed planning.

---

## 13. Quartermaster system (NEXT IMPLEMENTATION)

### 13.1 Overview

The **Quartermaster** represents the player's logistical and record-keeping needs while in port. While the Captain (top status bar) handles immediate operational needs at sea, the Quartermaster manages:

- **Price history logs** – tracking market prices across ports and time
- **Trade journal** – record of all transactions
- **Voyage logs** – history of travels and events
- **Market intelligence** – price trends and profit opportunities

**UI location:** Bottom collapsible panel in the Port screen, accessible via a toggle button (📋 or 📊).

### 13.2 Core features

#### 13.2.1 Price history tracker

**Purpose:** Help players identify profitable trade routes by showing historical prices.

**Data to track:**
- Good name and category
- Port name
- Price observed
- Timestamp (turn number or date)
- Stock level at time of observation

**Display options:**
1. **Table view:**
   - Columns: Port | Good | Current Price | Last Seen Price | Change % | Timestamp
   - Sortable by any column
   - Color coding: green for price drops (good for buying), red for price increases (good for selling)

2. **Chart view (future enhancement):**
   - Simple line graph showing price trends over time for selected good
   - Multiple ports overlaid for comparison

**Implementation details:**
- New database table: `price_history`
  ```sql
  CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    port_id INTEGER NOT NULL,
    good_id INTEGER NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    turn_number INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (port_id) REFERENCES ports(id),
    FOREIGN KEY (good_id) REFERENCES goods(id)
  );
  ```
- Record price snapshot whenever:
  - Player visits a port (automatic on arrival)
  - Player views market in port
- New API endpoint: `GET /api/quartermaster/price-history?port_id=&good_id=`
  - Optional filters for port and/or good
  - Returns historical price data
  - Limit to last 50-100 entries per good/port combo for performance

#### 13.2.2 Trade journal

**Purpose:** Complete record of all buy/sell transactions for analysis.

**Data to track:**
- Transaction type (buy or sell)
- Good name
- Quantity
- Unit price
- Total cost/revenue
- Port name
- Timestamp
- Profit/loss calculation (for sells, compare to average purchase price)

**Display:**
- Paginated table showing recent transactions (most recent first)
- Filters: by good, by port, by transaction type, by date range
- Summary statistics:
  - Total trades
  - Total profit/loss
  - Most profitable good
  - Most traded good

**Implementation details:**
- New database table: `trade_journal`
  ```sql
  CREATE TABLE trade_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    port_id INTEGER NOT NULL,
    good_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    turn_number INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (port_id) REFERENCES ports(id),
    FOREIGN KEY (good_id) REFERENCES goods(id)
  );
  ```
- Insert record in trade API routes (both buy and sell)
- New API endpoint: `GET /api/quartermaster/trade-journal/:playerId?limit=&offset=&good_id=&port_id=&type=`

#### 13.2.3 Voyage logs

**Purpose:** Historical record of all travels and events encountered.

**Data to track:**
- Origin port
- Destination port
- Event type (if any)
- Event outcome description
- Damage taken
- Cargo lost/gained
- Money lost/gained
- Reputation changes
- Timestamp

**Display:**
- Chronological list of voyages
- Expandable entries showing full event details
- Statistics:
  - Total voyages
  - Events encountered by type
  - Most dangerous route
  - Safest route

**Implementation details:**
- New database table: `voyage_logs`
  ```sql
  CREATE TABLE voyage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    origin_port_id INTEGER NOT NULL,
    destination_port_id INTEGER NOT NULL,
    event_type TEXT,
    event_description TEXT,
    damage_taken INTEGER DEFAULT 0,
    cargo_changes TEXT,
    money_change REAL DEFAULT 0,
    reputation_changes TEXT,
    turn_number INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (origin_port_id) REFERENCES ports(id),
    FOREIGN KEY (destination_port_id) REFERENCES ports(id)
  );
  ```
- Insert record in travel API route after event resolution
- New API endpoint: `GET /api/quartermaster/voyage-logs/:playerId?limit=&offset=`

#### 13.2.4 Market intelligence (future enhancement)

**Purpose:** Provide actionable insights based on collected data.

**Features:**
- Best current arbitrage opportunities (buy low at port A, sell high at port B)
- Price trend indicators (rising, falling, stable)
- Route profitability calculator
- Risk vs. reward analysis for different routes

### 13.3 UI design

**Quartermaster panel (bottom of port screen):**

1. **Collapsed state (default):**
   - Thin bar at bottom with toggle button: "📊 Quartermaster's Ledger"
   - Shows quick stats: Total trades, Total profit, Last voyage result
   - Click to expand upward

2. **Expanded state:**
   - Slides up to cover ~40% of screen height
   - Tabbed interface:
     - **Tab 1: Price History** – price tracking table with filters
     - **Tab 2: Trade Journal** – transaction history with profit/loss
     - **Tab 3: Voyage Logs** – travel history and event records
     - **Tab 4: Intelligence** (future) – insights and opportunities
   - Close button (X) or click toggle again to collapse

**Visual style:**
- Matches existing UI aesthetic
- Table-based displays with sorting capabilities
- Color coding for price changes and profit/loss
- Compact but readable font
- Pagination for large datasets

### 13.4 Technical implementation steps

1. **Database changes:**
   - Create three new tables: `price_history`, `trade_journal`, `voyage_logs`
   - Add migration/schema update script
   - Update seed data if needed

2. **Backend API:**
   - Create new route file: `server/src/routes/quartermaster.js`
   - Implement endpoints:
     - GET `/api/quartermaster/price-history` with filters
     - GET `/api/quartermaster/trade-journal/:playerId` with pagination
     - GET `/api/quartermaster/voyage-logs/:playerId` with pagination
   - Modify existing routes:
     - Trade routes: insert into `trade_journal` after successful transactions
     - Travel route: insert into `voyage_logs` after event resolution
     - Port view: insert into `price_history` when player views market

3. **Frontend components:**
   - Create `QuartermasterPanel.jsx` component
     - Toggle button with collapse/expand state
     - Tabbed interface with three tabs
   - Create sub-components:
     - `PriceHistoryTable.jsx` – filterable price history
     - `TradeJournalTable.jsx` – transaction history with stats
     - `VoyageLogsTable.jsx` – voyage history display
   - Update `PortScreen.jsx` to include QuartermasterPanel at bottom
   - Update `services/api.js` with quartermaster API calls

4. **CSS/Styling:**
   - Add styles for bottom panel slide-up animation
   - Table styles with sorting indicators
   - Color coding for price changes and profit/loss
   - Responsive design for panel height
   - Tabbed interface styling

### 13.5 Future enhancements

- **Export functionality:** Download trade journal or price history as CSV
- **Charts and graphs:** Visual representation of price trends
- **Alerts:** Notify when prices reach certain thresholds
- **Notes system:** Allow player to add custom notes to ports or goods
- **Cargo tracking:** Show average purchase price for current cargo
- **Route planning:** Suggest profitable routes based on current cargo and market data

---

## 14. Assumptions and open questions

The following can be filled with reasonable defaults during implementation:

- **Time unit per turn:**  
  Days vs. voyages. For now, assume “voyage” is one abstract time unit.
- **Authentication:**  
  For now, can use simple per‑player tokens or no auth if local.
- **Balance values:**  
  All numeric parameters (prices, stocks, risk probabilities, reputation shifts) are placeholders and should be tuned iteratively.

If clarification is needed, the implementer (AI) should propose specific numeric defaults and explain the tradeoffs.

---
