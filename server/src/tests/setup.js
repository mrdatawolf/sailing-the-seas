const { initializeDatabase } = require('../db/schema');
const path = require('path');
const fs = require('fs');

// Use a separate test database
const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');

let testDbInstance = null;

function setupTestDatabase() {
  // Create or reuse test database
  if (!testDbInstance) {
    // Remove existing test database if it exists
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (err) {
      // File may be locked, continue anyway
    }

    // Create fresh test database
    testDbInstance = initializeDatabase(TEST_DB_PATH);
  }

  return testDbInstance;
}

function teardownTestDatabase() {
  // Close database connection
  if (testDbInstance && testDbInstance.close) {
    try {
      testDbInstance.close();
      testDbInstance = null;
    } catch (err) {
      console.error('Error closing test database:', err);
    }
  }

  // Clean up test database file
  // Use a delayed cleanup to ensure file handle is released
  const cleanup = () => {
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (err) {
      // File may still be locked, that's okay
    }
  };

  // Try cleanup immediately and after a delay
  setTimeout(cleanup, 100);
}

function seedTestData(db) {
  // Seed basic test data

  // Insert goods
  const goods = [
    { name: 'Tea', base_price: 50, volume_per_unit: 1, category: 'luxury', volatility: 1.0 },
    { name: 'Silk', base_price: 100, volume_per_unit: 1, category: 'textile', volatility: 1.2 },
    { name: 'Spices', base_price: 75, volume_per_unit: 1, category: 'spice', volatility: 1.5 },
  ];

  goods.forEach(good => {
    db.prepare(`
      INSERT INTO goods (name, base_price, volume_per_unit, category, volatility, legal_status_json)
      VALUES (?, ?, ?, ?, ?, '{}')
    `).run(good.name, good.base_price, good.volume_per_unit, good.category, good.volatility);
  });

  // Insert ports
  const ports = [
    { name: 'Canton', region: 'China', faction: 'Qing', security: 70, connected: ['Macau', 'Hong Kong'] },
    { name: 'Macau', region: 'China', faction: 'Portuguese', security: 60, connected: ['Canton', 'Hong Kong'] },
    { name: 'Hong Kong', region: 'China', faction: 'British', security: 80, connected: ['Canton', 'Macau'] },
  ];

  ports.forEach(port => {
    db.prepare(`
      INSERT INTO ports (name, region, faction, base_security_level, connected_ports_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(port.name, port.region, port.faction, port.security, JSON.stringify(port.connected));
  });

  // Insert port goods (market data)
  const portGoods = [
    // Canton
    { port: 'Canton', good: 'Tea', stock: 100, capacity: 200, base_price: 50 },
    { port: 'Canton', good: 'Silk', stock: 80, capacity: 150, base_price: 100 },
    { port: 'Canton', good: 'Spices', stock: 50, capacity: 100, base_price: 75 },
    // Macau
    { port: 'Macau', good: 'Tea', stock: 60, capacity: 150, base_price: 55 },
    { port: 'Macau', good: 'Silk', stock: 100, capacity: 200, base_price: 95 },
    { port: 'Macau', good: 'Spices', stock: 80, capacity: 150, base_price: 80 },
    // Hong Kong
    { port: 'Hong Kong', good: 'Tea', stock: 120, capacity: 250, base_price: 48 },
    { port: 'Hong Kong', good: 'Silk', stock: 70, capacity: 180, base_price: 105 },
    { port: 'Hong Kong', good: 'Spices', stock: 90, capacity: 200, base_price: 70 },
  ];

  portGoods.forEach(pg => {
    const portId = db.prepare('SELECT id FROM ports WHERE name = ?').get(pg.port).id;
    const goodId = db.prepare('SELECT id FROM goods WHERE name = ?').get(pg.good).id;

    db.prepare(`
      INSERT INTO port_goods (port_id, good_id, stock, stock_capacity, base_price)
      VALUES (?, ?, ?, ?, ?)
    `).run(portId, goodId, pg.stock, pg.capacity, pg.base_price);
  });

  return {
    ports: db.prepare('SELECT * FROM ports').all(),
    goods: db.prepare('SELECT * FROM goods').all(),
  };
}

function createTestPlayer(db, name = 'Test Trader') {
  const cantonId = db.prepare('SELECT id FROM ports WHERE name = ?').get('Canton').id;

  const result = db.prepare(`
    INSERT INTO players (name, current_port_id, money, lawful_reputation, pirate_reputation)
    VALUES (?, ?, 1000.0, 50.0, 0.0)
  `).run(name, cantonId);

  const playerId = result.lastInsertRowid;

  // Create starter ship
  db.prepare(`
    INSERT INTO ships (player_id, name, type, max_cargo, speed, hull_strength, current_hull, guns)
    VALUES (?, 'Test Ship', 'junk', 100, 50, 100, 100, 5)
  `).run(playerId);

  return playerId;
}

module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
  seedTestData,
  createTestPlayer,
  TEST_DB_PATH,
};
