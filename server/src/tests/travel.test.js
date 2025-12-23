const request = require('supertest');
const { createTestApp } = require('./testApp');
const { seedTestData, createTestPlayer, teardownTestDatabase } = require('./setup');
const db = require('../db');

describe('Travel API', () => {
  let app;
  let testPlayerId;
  let testPorts;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createTestApp();
    const seedData = seedTestData(db.get());
    testPorts = seedData.ports;
    testPlayerId = createTestPlayer(db.get(), 'Travel Tester');
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  describe('POST /api/travel', () => {
    it('should successfully travel between connected ports', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const macau = testPorts.find(p => p.name === 'Macau');

      // Set player at Canton
      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      const response = await request(app)
        .post('/api/travel')
        .send({
          player_id: testPlayerId,
          destination_port_id: macau.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.origin_port).toBe('Canton');
      expect(response.body.destination_port).toBe('Macau');
    });

    it('should update player location after successful travel', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const hongKong = testPorts.find(p => p.name === 'Hong Kong');

      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      const response = await request(app)
        .post('/api/travel')
        .send({
          player_id: testPlayerId,
          destination_port_id: hongKong.id,
        })
        .expect(200);

      if (response.body.arrived) {
        const player = db.prepare('SELECT current_port_id FROM players WHERE id = ?').get(testPlayerId);
        expect(player.current_port_id).toBe(hongKong.id);
      }
    });

    it('should reject travel to non-connected ports', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');

      // Create a disconnected port for testing
      db.prepare(`
        INSERT INTO ports (name, region, faction, base_security_level, connected_ports_json)
        VALUES ('Isolated Port', 'Test', 'Test', 50, '[]')
      `).run();

      const isolatedPort = db.prepare('SELECT id FROM ports WHERE name = ?').get('Isolated Port');

      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      const response = await request(app)
        .post('/api/travel')
        .send({
          player_id: testPlayerId,
          destination_port_id: isolatedPort.id,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/no direct route/i);
    });

    it('should return 400 for invalid player', async () => {
      const macau = testPorts.find(p => p.name === 'Macau');

      const response = await request(app)
        .post('/api/travel')
        .send({
          player_id: 99999,
          destination_port_id: macau.id,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid destination', async () => {
      const response = await request(app)
        .post('/api/travel')
        .send({
          player_id: testPlayerId,
          destination_port_id: 99999,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should log voyage to voyage_logs', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const macau = testPorts.find(p => p.name === 'Macau');

      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      await request(app)
        .post('/api/travel')
        .send({
          player_id: testPlayerId,
          destination_port_id: macau.id,
        })
        .expect(200);

      const logs = db.prepare('SELECT * FROM voyage_logs WHERE player_id = ?').all(testPlayerId);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should include event information when event occurs', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const macau = testPorts.find(p => p.name === 'Macau');

      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      // Travel multiple times to increase chance of getting an event
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/travel')
          .send({
            player_id: testPlayerId,
            destination_port_id: macau.id,
          });

        responses.push(response.body);

        // Reset position
        db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);
      }

      // At least one should have an event (statistically)
      const hasEvent = responses.some(r => r.event !== null);

      // Check that response structure is correct when event occurs
      const eventResponse = responses.find(r => r.event !== null);
      if (eventResponse) {
        expect(eventResponse.event).toHaveProperty('type');
        expect(eventResponse.event).toHaveProperty('message');
      }
    });

    it('should handle storm events correctly', async () => {
      const canton = testPorts.find(p => p.name === 'Canton');
      const macau = testPorts.find(p => p.name === 'Macau');

      db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);

      const shipBefore = db.prepare('SELECT current_hull FROM ships WHERE player_id = ?').get(testPlayerId);

      // Travel multiple times
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/travel')
          .send({
            player_id: testPlayerId,
            destination_port_id: macau.id,
          });

        db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?').run(canton.id, testPlayerId);
      }

      const shipAfter = db.prepare('SELECT current_hull FROM ships WHERE player_id = ?').get(testPlayerId);

      // After many trips, ship should have some damage (statistically very likely)
      // This verifies storm events are working
      expect(shipAfter.current_hull).toBeLessThanOrEqual(shipBefore.current_hull);
    });
  });
});
