const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize database (creates tables and seeds data)
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Far East Trader API is running' });
});

// API Routes
app.use('/api/player', require('./routes/player'));
app.use('/api/ports', require('./routes/ports'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/quartermaster', require('./routes/quartermaster'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🚢 Far East Trader API Server`);
  console.log(`===========================================`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`===========================================\n`);
});
