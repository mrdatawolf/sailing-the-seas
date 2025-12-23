const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');

module.exports = async () => {
  // Wait a bit to ensure all connections are closed
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try to remove test database
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
        console.log('Test database cleaned up successfully');
        break;
      }
    } catch (err) {
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('Note: Test database file may still be in use (this is normal on Windows)');
      }
    }
  }
};
