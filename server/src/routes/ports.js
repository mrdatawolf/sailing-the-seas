const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/ports - Get all ports
router.get('/', (req, res) => {
  try {
    const ports = db.prepare(`
      SELECT id, name, region, faction, base_security_level
      FROM ports
      ORDER BY name
    `).all();

    // Parse connected_ports_json for each port
    ports.forEach(port => {
      const fullPort = db.prepare('SELECT connected_ports_json FROM ports WHERE id = ?').get(port.id);
      port.connected_ports = JSON.parse(fullPort.connected_ports_json || '[]');
    });

    res.json(ports);
  } catch (error) {
    console.error('Error fetching ports:', error);
    res.status(500).json({ error: 'Failed to fetch ports' });
  }
});

// GET /api/ports/:id - Get specific port with market data
router.get('/:id', (req, res) => {
  try {
    const portId = parseInt(req.params.id);

    if (isNaN(portId)) {
      return res.status(400).json({ error: 'Invalid port ID' });
    }

    // Get port info
    const port = db.prepare(`
      SELECT * FROM ports WHERE id = ?
    `).get(portId);

    if (!port) {
      return res.status(404).json({ error: 'Port not found' });
    }

    port.connected_ports = JSON.parse(port.connected_ports_json || '[]');
    delete port.connected_ports_json;

    // Get market data (goods available at this port)
    const market = db.prepare(`
      SELECT
        pg.id,
        pg.good_id,
        g.name as good_name,
        g.category,
        g.volume_per_unit,
        pg.stock,
        pg.stock_capacity,
        pg.base_price
      FROM port_goods pg
      JOIN goods g ON pg.good_id = g.id
      WHERE pg.port_id = ?
      ORDER BY g.name
    `).all(portId);

    // Calculate current prices based on stock levels and log to price history
    market.forEach(item => {
      item.current_price = calculatePrice(item.stock, item.stock_capacity, item.base_price);

      // Log price to price_history (limit to one entry per port/good per visit)
      // Check if we already have a recent entry (within last 60 seconds to avoid spam)
      const recentEntry = db.prepare(`
        SELECT id FROM price_history
        WHERE port_id = ? AND good_id = ? AND timestamp > strftime('%s', 'now') - 60
      `).get(portId, item.good_id);

      if (!recentEntry) {
        db.prepare(`
          INSERT INTO price_history (port_id, good_id, price, stock)
          VALUES (?, ?, ?, ?)
        `).run(portId, item.good_id, item.current_price, item.stock);
      }
    });

    res.json({
      port,
      market,
    });
  } catch (error) {
    console.error('Error fetching port:', error);
    res.status(500).json({ error: 'Failed to fetch port' });
  }
});

// Price calculation function (from architecture doc)
function calculatePrice(stock, capacity, basePrice, alpha = 1.0) {
  const r = stock / capacity; // stock ratio
  const m = 1 + alpha * (0.5 - r); // price multiplier
  const price = basePrice * m;

  // Clamp price between 50% and 200% of base price
  const minPrice = basePrice * 0.5;
  const maxPrice = basePrice * 2.0;

  return Math.max(minPrice, Math.min(maxPrice, price));
}

module.exports = router;
