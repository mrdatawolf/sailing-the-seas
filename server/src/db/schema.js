const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase(dbPath = path.join(__dirname, '../../data/game.db')) {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      current_port_id INTEGER NOT NULL,
      money REAL NOT NULL DEFAULT 1000.0,
      lawful_reputation REAL NOT NULL DEFAULT 50.0,
      pirate_reputation REAL NOT NULL DEFAULT 0.0,
      faction_reputation_json TEXT DEFAULT '{}',
      FOREIGN KEY (current_port_id) REFERENCES ports(id)
    )
  `);

  // Ships table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      max_cargo INTEGER NOT NULL,
      speed INTEGER NOT NULL,
      hull_strength INTEGER NOT NULL,
      current_hull INTEGER NOT NULL,
      guns INTEGER NOT NULL,
      armor_level INTEGER NOT NULL DEFAULT 0,
      sail_rigging_level INTEGER NOT NULL DEFAULT 0,
      cargo_mods_level INTEGER NOT NULL DEFAULT 0,
      gun_mods_level INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);

  // Ports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL,
      faction TEXT NOT NULL,
      base_security_level INTEGER NOT NULL DEFAULT 50,
      connected_ports_json TEXT NOT NULL DEFAULT '[]'
    )
  `);

  // Goods table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      base_price REAL NOT NULL,
      volume_per_unit INTEGER NOT NULL,
      legal_status_json TEXT DEFAULT '{}',
      volatility REAL NOT NULL DEFAULT 1.0,
      category TEXT NOT NULL
    )
  `);

  // PortGoods table (port-specific stock and pricing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS port_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      port_id INTEGER NOT NULL,
      good_id INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      stock_capacity INTEGER NOT NULL,
      base_price REAL NOT NULL,
      UNIQUE(port_id, good_id),
      FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
    )
  `);

  // PlayerCargo table
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_cargo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      ship_id INTEGER,
      good_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      UNIQUE(player_id, ship_id, good_id),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
      FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
    )
  `);

  // WorldEvents table (for logging and future features)
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // PriceHistory table (quartermaster: track market prices over time)
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      port_id INTEGER NOT NULL,
      good_id INTEGER NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      turn_number INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
    )
  `);

  // TradeJournal table (quartermaster: record all buy/sell transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trade_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      port_id INTEGER NOT NULL,
      good_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('buy', 'sell')),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      turn_number INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
    )
  `);

  // VoyageLogs table (quartermaster: history of travels and events)
  db.exec(`
    CREATE TABLE IF NOT EXISTS voyage_logs (
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
      turn_number INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (origin_port_id) REFERENCES ports(id),
      FOREIGN KEY (destination_port_id) REFERENCES ports(id)
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ships_player ON ships(player_id);
    CREATE INDEX IF NOT EXISTS idx_port_goods_port ON port_goods(port_id);
    CREATE INDEX IF NOT EXISTS idx_player_cargo_player ON player_cargo(player_id);
    CREATE INDEX IF NOT EXISTS idx_world_events_created ON world_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_price_history_port_good ON price_history(port_id, good_id);
    CREATE INDEX IF NOT EXISTS idx_trade_journal_player ON trade_journal(player_id);
    CREATE INDEX IF NOT EXISTS idx_trade_journal_timestamp ON trade_journal(timestamp);
    CREATE INDEX IF NOT EXISTS idx_voyage_logs_player ON voyage_logs(player_id);
    CREATE INDEX IF NOT EXISTS idx_voyage_logs_timestamp ON voyage_logs(timestamp);
  `);

  return db;
}

module.exports = { initializeDatabase };
