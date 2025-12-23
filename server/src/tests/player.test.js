const request = require('supertest');
const { createTestApp } = require('./testApp');
const { seedTestData, createTestPlayer, teardownTestDatabase } = require('./setup');
const db = require('../db');

describe('Player API', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createTestApp();
    seedTestData(db.get());
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  describe('POST /api/player/create', () => {
    it('should create a new player with starting ship and money', async () => {
      const response = await request(app)
        .post('/api/player/create')
        .send({ name: 'Captain Jack' })
        .expect(200);

      expect(response.body).toHaveProperty('player');
      expect(response.body).toHaveProperty('ships');
      expect(response.body.player.name).toBe('Captain Jack');
      expect(response.body.player.money).toBe(1000);
      expect(response.body.ships).toHaveLength(1);
      expect(response.body.ships[0].name).toBe('Lucky Dragon');
    });

    it('should return error if name is missing', async () => {
      const response = await request(app)
        .post('/api/player/create')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should place new player at Canton (starting port)', async () => {
      const response = await request(app)
        .post('/api/player/create')
        .send({ name: 'New Trader' })
        .expect(200);

      const canton = db.prepare('SELECT id FROM ports WHERE name = ?').get('Canton');
      expect(response.body.player.current_port_id).toBe(canton.id);
    });
  });

  describe('GET /api/player/:id', () => {
    let testPlayerId;

    beforeAll(() => {
      testPlayerId = createTestPlayer(db.get(), 'Test Player');
    });

    it('should return complete player state', async () => {
      const response = await request(app)
        .get(`/api/player/${testPlayerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('player');
      expect(response.body).toHaveProperty('ships');
      expect(response.body).toHaveProperty('cargo');
      expect(response.body).toHaveProperty('current_port');
      expect(response.body.player.id).toBe(testPlayerId);
    });

    it('should return 404 for non-existent player', async () => {
      const response = await request(app)
        .get('/api/player/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should include ship details with correct stats', async () => {
      const response = await request(app)
        .get(`/api/player/${testPlayerId}`)
        .expect(200);

      expect(response.body.ships[0]).toHaveProperty('max_cargo');
      expect(response.body.ships[0]).toHaveProperty('guns');
      expect(response.body.ships[0]).toHaveProperty('current_hull');
      expect(response.body.ships[0].current_hull).toBeLessThanOrEqual(response.body.ships[0].hull_strength);
    });
  });
});
