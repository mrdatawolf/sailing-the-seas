const request = require('supertest');
const { createTestApp } = require('./testApp');
const { seedTestData, createTestPlayer, teardownTestDatabase } = require('./setup');
const db = require('../db');

describe('Trade API', () => {
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
    testPlayerId = createTestPlayer(db.get(), 'Trade Tester');
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  describe('POST /api/trade/buy', () => {
    it('should successfully buy goods when conditions are met', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const response = await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction.type).toBe('buy');
      expect(response.body.transaction.quantity).toBe(10);
    });

    it('should deduct money from player', async () => {
      const playerBefore = db.prepare('SELECT money FROM players WHERE id = ?').get(testPlayerId);
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 5,
        })
        .expect(200);

      const playerAfter = db.prepare('SELECT money FROM players WHERE id = ?').get(testPlayerId);
      expect(playerAfter.money).toBeLessThan(playerBefore.money);
    });

    it('should add goods to player cargo', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      const cargo = db.prepare('SELECT quantity FROM player_cargo WHERE player_id = ? AND good_id = ?')
        .get(testPlayerId, teaId);

      expect(cargo).toBeTruthy();
      expect(cargo.quantity).toBeGreaterThanOrEqual(10);
    });

    it('should reduce port stock', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const stockBefore = db.prepare('SELECT stock FROM port_goods WHERE port_id = ? AND good_id = ?')
        .get(canton.id, teaId);

      await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 5,
        })
        .expect(200);

      const stockAfter = db.prepare('SELECT stock FROM port_goods WHERE port_id = ? AND good_id = ?')
        .get(canton.id, teaId);

      expect(stockAfter.stock).toBe(stockBefore.stock - 5);
    });

    it('should reject purchase if insufficient funds', async () => {
      const silkId = testGoods.find(g => g.name === 'Silk').id;

      const response = await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: silkId,
          quantity: 1000, // Way too expensive
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/insufficient funds/i);
    });

    it('should reject purchase if insufficient stock', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const response = await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10000, // More than available
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/insufficient stock/i);
    });

    it('should log transaction to trade_journal', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      await request(app)
        .post('/api/trade/buy')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 3,
        })
        .expect(200);

      const journal = db.prepare('SELECT * FROM trade_journal WHERE player_id = ? AND good_id = ? AND transaction_type = ?')
        .all(testPlayerId, teaId, 'buy');

      expect(journal.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/trade/sell', () => {
    beforeEach(async () => {
      // Ensure player has some goods to sell
      const teaId = testGoods.find(g => g.name === 'Tea').id;
      db.prepare('INSERT OR REPLACE INTO player_cargo (player_id, good_id, quantity) VALUES (?, ?, ?)')
        .run(testPlayerId, teaId, 50);
    });

    it('should successfully sell goods when player has them', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const response = await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction.type).toBe('sell');
      expect(response.body.transaction.quantity).toBe(10);
    });

    it('should add money to player', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;
      const playerBefore = db.prepare('SELECT money FROM players WHERE id = ?').get(testPlayerId);

      await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      const playerAfter = db.prepare('SELECT money FROM players WHERE id = ?').get(testPlayerId);
      expect(playerAfter.money).toBeGreaterThan(playerBefore.money);
    });

    it('should remove goods from player cargo', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      const cargo = db.prepare('SELECT quantity FROM player_cargo WHERE player_id = ? AND good_id = ?')
        .get(testPlayerId, teaId);

      expect(cargo.quantity).toBeLessThan(50);
    });

    it('should increase port stock', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      const stockBefore = db.prepare('SELECT stock FROM port_goods WHERE port_id = ? AND good_id = ?')
        .get(canton.id, teaId);

      await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 10,
        })
        .expect(200);

      const stockAfter = db.prepare('SELECT stock FROM port_goods WHERE port_id = ? AND good_id = ?')
        .get(canton.id, teaId);

      expect(stockAfter.stock).toBe(stockBefore.stock + 10);
    });

    it('should reject sale if player has insufficient cargo', async () => {
      const silkId = testGoods.find(g => g.name === 'Silk').id;

      const response = await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: silkId,
          quantity: 1000,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/insufficient cargo/i);
    });

    it('should log transaction to trade_journal', async () => {
      const teaId = testGoods.find(g => g.name === 'Tea').id;

      await request(app)
        .post('/api/trade/sell')
        .send({
          player_id: testPlayerId,
          good_id: teaId,
          quantity: 5,
        })
        .expect(200);

      const journal = db.prepare('SELECT * FROM trade_journal WHERE player_id = ? AND good_id = ? AND transaction_type = ?')
        .all(testPlayerId, teaId, 'sell');

      expect(journal.length).toBeGreaterThan(0);
    });
  });
});
