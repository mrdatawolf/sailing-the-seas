const request = require('supertest');
const { createTestApp } = require('./testApp');
const { seedTestData, createTestPlayer, teardownTestDatabase } = require('./setup');
const db = require('../db');

describe('Quartermaster API', () => {
  let app;
  let testPlayerId;
  let testPorts;
  let testGoods;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createTestApp();
    const seedData = seedTestData(db.get());
    testPorts = seedData.ports;
    testGoods = seedData.goods;
    testPlayerId = createTestPlayer(db.get(), 'QM Tester');

    // Create some test data for quartermaster features
    setupQuartermasterTestData();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  function setupQuartermasterTestData() {
    const canton = testPorts.find(p => p.name === 'Canton');
    const macau = testPorts.find(p => p.name === 'Macau');
    const teaId = testGoods.find(g => g.name === 'Tea').id;
    const silkId = testGoods.find(g => g.name === 'Silk').id;

    // Insert some price history
    db.prepare(`
      INSERT INTO price_history (port_id, good_id, price, stock, timestamp)
      VALUES (?, ?, 50.0, 100, strftime('%s', 'now') - 3600)
    `).run(canton.id, teaId);

    db.prepare(`
      INSERT INTO price_history (port_id, good_id, price, stock, timestamp)
      VALUES (?, ?, 55.0, 90, strftime('%s', 'now') - 1800)
    `).run(canton.id, teaId);

    db.prepare(`
      INSERT INTO price_history (port_id, good_id, price, stock, timestamp)
      VALUES (?, ?, 100.0, 80, strftime('%s', 'now') - 3600)
    `).run(macau.id, silkId);

    // Insert some trade journal entries
    db.prepare(`
      INSERT INTO trade_journal (player_id, port_id, good_id, transaction_type, quantity, unit_price, total_amount, timestamp)
      VALUES (?, ?, ?, 'buy', 10, 50.0, 500.0, strftime('%s', 'now') - 7200)
    `).run(testPlayerId, canton.id, teaId);

    db.prepare(`
      INSERT INTO trade_journal (player_id, port_id, good_id, transaction_type, quantity, unit_price, total_amount, timestamp)
      VALUES (?, ?, ?, 'sell', 10, 55.0, 550.0, strftime('%s', 'now') - 3600)
    `).run(testPlayerId, macau.id, teaId);

    db.prepare(`
      INSERT INTO trade_journal (player_id, port_id, good_id, transaction_type, quantity, unit_price, total_amount, timestamp)
      VALUES (?, ?, ?, 'buy', 5, 100.0, 500.0, strftime('%s', 'now') - 1800)
    `).run(testPlayerId, macau.id, silkId);

    // Insert some voyage logs
    db.prepare(`
      INSERT INTO voyage_logs (player_id, origin_port_id, destination_port_id, event_type, event_description, damage_taken, money_change, timestamp)
      VALUES (?, ?, ?, 'storm', 'A major storm hit your fleet! Test Ship took 30 hull damage', 30, 0, strftime('%s', 'now') - 7200)
    `).run(testPlayerId, canton.id, macau.id);

    db.prepare(`
      INSERT INTO voyage_logs (player_id, origin_port_id, destination_port_id, event_type, event_description, damage_taken, money_change, timestamp)
      VALUES (?, ?, ?, NULL, 'Safe passage', 0, 0, strftime('%s', 'now') - 3600)
    `).run(testPlayerId, macau.id, canton.id);

    db.prepare(`
      INSERT INTO voyage_logs (player_id, origin_port_id, destination_port_id, event_type, event_description, damage_taken, money_change, timestamp)
      VALUES (?, ?, ?, 'pirates', 'Pirates attacked but you drove them off! Gained 150 silver from captured loot', 0, 150, strftime('%s', 'now') - 1800)
    `).run(testPlayerId, canton.id, macau.id);
  }

  describe('GET /api/quartermaster/price-history', () => {
    it('should return price history records', async () => {
      const response = await request(app)
        .get('/api/quartermaster/price-history')
        .expect(200);

      expect(response.body).toHaveProperty('priceHistory');
      expect(Array.isArray(response.body.priceHistory)).toBe(true);
      expect(response.body.priceHistory.length).toBeGreaterThan(0);
    });

    it('should include port and good names in results', async () => {
      const response = await request(app)
        .get('/api/quartermaster/price-history')
        .expect(200);

      const entry = response.body.priceHistory[0];
      expect(entry).toHaveProperty('port_name');
      expect(entry).toHaveProperty('good_name');
      expect(entry).toHaveProperty('price');
      expect(entry).toHaveProperty('stock');
    });

    it('should filter by port_id when provided', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');

      const response = await request(app)
        .get(`/api/quartermaster/price-history?port_id=${canton.id}`)
        .expect(200);

      expect(response.body.priceHistory.every(e => e.port_name === 'Canton')).toBe(true);
    });

    it('should filter by good_id when provided', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const response = await request(app)
        .get(`/api/quartermaster/price-history?good_id=${teaId}`)
        .expect(200);

      expect(response.body.priceHistory.every(e => e.good_name === 'Tea')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/quartermaster/price-history?limit=2')
        .expect(200);

      expect(response.body.priceHistory.length).toBeLessThanOrEqual(2);
    });

    it('should return records in descending timestamp order', async () => {
      const response = await request(app)
        .get('/api/quartermaster/price-history')
        .expect(200);

      if (response.body.priceHistory.length > 1) {
        const first = response.body.priceHistory[0].timestamp;
        const second = response.body.priceHistory[1].timestamp;
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });
  });

  describe('GET /api/quartermaster/trade-journal/:playerId', () => {
    it('should return trade journal for player', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('trades');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.trades)).toBe(true);
      expect(response.body.trades.length).toBeGreaterThan(0);
    });

    it('should include transaction details in trades', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}`)
        .expect(200);

      const trade = response.body.trades[0];
      expect(trade).toHaveProperty('transaction_type');
      expect(trade).toHaveProperty('port_name');
      expect(trade).toHaveProperty('good_name');
      expect(trade).toHaveProperty('quantity');
      expect(trade).toHaveProperty('unit_price');
      expect(trade).toHaveProperty('total_amount');
    });

    it('should return statistics', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}`)
        .expect(200);

      expect(response.body.stats).toHaveProperty('total_trades');
      expect(response.body.stats).toHaveProperty('net_profit');
      expect(response.body.stats.total_trades).toBeGreaterThan(0);
    });

    it('should filter by transaction type when provided', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}?type=buy`)
        .expect(200);

      expect(response.body.trades.every(t => t.transaction_type === 'buy')).toBe(true);
    });

    it('should filter by good_id when provided', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}?good_id=${teaId}`)
        .expect(200);

      expect(response.body.trades.every(t => t.good_name === 'Tea')).toBe(true);
    });

    it('should filter by port_id when provided', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');

      const response = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}?port_id=${canton.id}`)
        .expect(200);

      expect(response.body.trades.every(t => t.port_name === 'Canton')).toBe(true);
    });

    it('should respect limit and offset parameters', async () => {
      const response1 = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}?limit=1`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/quartermaster/trade-journal/${testPlayerId}?limit=1&offset=1`)
        .expect(200);

      expect(response1.body.trades.length).toBe(1);
      expect(response2.body.trades.length).toBeLessThanOrEqual(1);

      if (response2.body.trades.length > 0) {
        expect(response1.body.trades[0].id).not.toBe(response2.body.trades[0].id);
      }
    });
  });

  describe('GET /api/quartermaster/voyage-logs/:playerId', () => {
    it('should return voyage logs for player', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('voyages');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.voyages)).toBe(true);
      expect(response.body.voyages.length).toBeGreaterThan(0);
    });

    it('should include voyage details', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}`)
        .expect(200);

      const voyage = response.body.voyages[0];
      expect(voyage).toHaveProperty('origin_port_name');
      expect(voyage).toHaveProperty('destination_port_name');
      expect(voyage).toHaveProperty('event_type');
      expect(voyage).toHaveProperty('event_description');
      expect(voyage).toHaveProperty('damage_taken');
      expect(voyage).toHaveProperty('money_change');
    });

    it('should return statistics', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}`)
        .expect(200);

      expect(response.body.stats).toHaveProperty('total_voyages');
      expect(response.body.stats).toHaveProperty('events_encountered');
      expect(response.body.stats).toHaveProperty('storms');
      expect(response.body.stats).toHaveProperty('pirate_encounters');
      expect(response.body.stats.total_voyages).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}?limit=2`)
        .expect(200);

      expect(response.body.voyages.length).toBeLessThanOrEqual(2);
    });

    it('should return voyages in descending timestamp order', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}`)
        .expect(200);

      if (response.body.voyages.length > 1) {
        const first = response.body.voyages[0].timestamp;
        const second = response.body.voyages[1].timestamp;
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should calculate statistics correctly', async () => {
      const response = await request(app)
        .get(`/api/quartermaster/voyage-logs/${testPlayerId}`)
        .expect(200);

      const stats = response.body.stats;
      expect(stats.total_voyages).toBe(3);
      expect(stats.storms).toBe(1);
      expect(stats.pirate_encounters).toBe(1);
      expect(stats.total_damage).toBe(30);
    });
  });
});
