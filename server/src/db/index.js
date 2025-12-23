const { initializeDatabase } = require('./schema');
const { seedDatabase } = require('./seed');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
let db = initializeDatabase();

// Seed database with initial data (skip if in test mode)
if (process.env.NODE_ENV !== 'test') {
  seedDatabase(db);
}

// Export db with ability to override for testing
module.exports = {
  get: () => db,
  set: (newDb) => { db = newDb; },
  prepare: (...args) => db.prepare(...args),
  transaction: (...args) => db.transaction(...args),
  exec: (...args) => db.exec(...args),
  pragma: (...args) => db.pragma(...args),
};
