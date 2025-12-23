const express = require('express');
const db = require('../db');
const { setupTestDatabase, TEST_DB_PATH } = require('./setup');

function createTestApp() {
  // Initialize test database
  const testDb = setupTestDatabase();

  // Override the db module to use test database
  db.set(testDb);

  const app = express();

  // Middleware
  app.use(express.json());

  // API Routes
  app.use('/api/player', require('../routes/player'));
  app.use('/api/ports', require('../routes/ports'));
  app.use('/api/trade', require('../routes/trade'));
  app.use('/api/travel', require('../routes/travel'));
  app.use('/api/quartermaster', require('../routes/quartermaster'));

  return app;
}

module.exports = { createTestApp };
