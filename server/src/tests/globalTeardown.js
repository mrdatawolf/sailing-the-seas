const path = require('path');
const fs = require('fs');
const db = require('../db');

const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');

module.exports = async () => {
  // Close the database connection
  try {
    const dbInstance = db.get();
    if (dbInstance && dbInstance.close) {
      dbInstance.close();
    }
  } catch (err) {
    // Database might already be closed
  }

  // Try to remove test database (single attempt, no delays)
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (err) {
    // File may still be locked, that's okay - forceExit will handle it
  }
};
