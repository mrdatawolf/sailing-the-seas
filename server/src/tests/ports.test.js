const request = require('supertest');
const { createTestApp } = require('./testApp');
const { seedTestData, teardownTestDatabase } = require('./setup');
const db = require('../db');

describe('Ports API', () => {
  let app;
  let testPorts;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createTestApp();
    const seedData = seedTestData(db.get());
    testPorts = seedData.ports;
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  describe('GET /api/ports', () => {
    it('should return all ports', async () => {
      const response = await request(app)
        .get('/api/ports')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('region');
      expect(response.body[0]).toHaveProperty('faction');
    });

    it('should include connected ports for each port', async () => {
      const response = await request(app)
        .get('/api/ports')
        .expect(200);

      const canton = response.body.find(p => p.name === 'Canton');
      expect(canton).toHaveProperty('connected_ports');
      expect(Array.isArray(canton.connected_ports)).toBe(true);
    });
  });

  describe('GET /api/ports/:id', () => {
    it('should return port details with market data', async () => {
      const cantonId = testPorts.find(p => p.name === 'Canton').id;

      const response = await request(app)
        .get(`/api/ports/${cantonId}`)
        .expect(200);

      expect(response.body).toHaveProperty('port');
      expect(response.body).toHaveProperty('market');
      expect(response.body.port.name).toBe('Canton');
      expect(Array.isArray(response.body.market)).toBe(true);
    });

    it('should calculate dynamic prices based on stock levels', async () => {
      const cantonId = testPorts.find(p => p.name === 'Canton').id;

      const response = await request(app)
        .get(`/api/ports/${cantonId}`)
        .expect(200);

      const marketItem = response.body.market[0];
      expect(marketItem).toHaveProperty('current_price');
      expect(marketItem).toHaveProperty('base_price');
      expect(marketItem.current_price).toBeGreaterThan(0);
    });

    it('should include stock information for each good', async () => {
      const cantonId = testPorts.find(p => p.name === 'Canton').id;

      const response = await request(app)
        .get(`/api/ports/${cantonId}`)
        .expect(200);

      const marketItem = response.body.market[0];
      expect(marketItem).toHaveProperty('stock');
      expect(marketItem).toHaveProperty('stock_capacity');
      expect(marketItem.stock).toBeLessThanOrEqual(marketItem.stock_capacity);
    });

    it('should return 404 for non-existent port', async () => {
      const response = await request(app)
        .get('/api/ports/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid port ID', async () => {
      const response = await request(app)
        .get('/api/ports/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should log price to price_history table', async () => {
      const cantonId = testPorts.find(p => p.name === 'Canton').id;

      await request(app)
        .get(`/api/ports/${cantonId}`)
        .expect(200);

      // Check if price was logged
      const priceHistory = db.prepare('SELECT COUNT(*) as count FROM price_history WHERE port_id = ?').get(cantonId);
      expect(priceHistory.count).toBeGreaterThan(0);
    });
  });
});
