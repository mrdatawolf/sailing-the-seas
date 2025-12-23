const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/quartermaster/price-history
 * Get price history records with optional filters
 * Query params:
 *   - port_id: filter by port (optional)
 *   - good_id: filter by good (optional)
 *   - limit: max records to return (default 100)
 */
router.get('/price-history', (req, res) => {
  try {
    const { port_id, good_id, limit = 100 } = req.query;

    let query = `
      SELECT
        ph.id,
        ph.port_id,
        p.name as port_name,
        ph.good_id,
        g.name as good_name,
        g.category as good_category,
        ph.price,
        ph.stock,
        ph.turn_number,
        ph.timestamp
      FROM price_history ph
      JOIN ports p ON ph.port_id = p.id
      JOIN goods g ON ph.good_id = g.id
      WHERE 1=1
    `;

    const params = [];

    if (port_id) {
      query += ' AND ph.port_id = ?';
      params.push(port_id);
    }

    if (good_id) {
      query += ' AND ph.good_id = ?';
      params.push(good_id);
    }

    query += ' ORDER BY ph.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const priceHistory = db.get().prepare(query).all(...params);

    res.json({ priceHistory });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * GET /api/quartermaster/trade-journal/:playerId
 * Get trade journal records for a player with optional filters
 * Query params:
 *   - good_id: filter by good (optional)
 *   - port_id: filter by port (optional)
 *   - type: filter by transaction type ('buy' or 'sell') (optional)
 *   - limit: max records to return (default 50)
 *   - offset: pagination offset (default 0)
 */
router.get('/trade-journal/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const { good_id, port_id, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        tj.id,
        tj.player_id,
        tj.port_id,
        p.name as port_name,
        tj.good_id,
        g.name as good_name,
        g.category as good_category,
        tj.transaction_type,
        tj.quantity,
        tj.unit_price,
        tj.total_amount,
        tj.turn_number,
        tj.timestamp
      FROM trade_journal tj
      JOIN ports p ON tj.port_id = p.id
      JOIN goods g ON tj.good_id = g.id
      WHERE tj.player_id = ?
    `;

    const params = [playerId];

    if (good_id) {
      query += ' AND tj.good_id = ?';
      params.push(good_id);
    }

    if (port_id) {
      query += ' AND tj.port_id = ?';
      params.push(port_id);
    }

    if (type && (type === 'buy' || type === 'sell')) {
      query += ' AND tj.transaction_type = ?';
      params.push(type);
    }

    query += ' ORDER BY tj.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const trades = db.get().prepare(query).all(...params);

    // Get summary statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN transaction_type = 'sell' THEN total_amount ELSE -total_amount END) as net_profit,
        (SELECT g.name FROM trade_journal tj2
         JOIN goods g ON tj2.good_id = g.id
         WHERE tj2.player_id = ? AND tj2.transaction_type = 'sell'
         GROUP BY tj2.good_id
         ORDER BY SUM(tj2.total_amount - (
           SELECT AVG(tj3.total_amount / tj3.quantity)
           FROM trade_journal tj3
           WHERE tj3.good_id = tj2.good_id AND tj3.player_id = ? AND tj3.transaction_type = 'buy'
         ) * tj2.quantity) DESC
         LIMIT 1) as most_profitable_good,
        (SELECT g.name FROM trade_journal tj2
         JOIN goods g ON tj2.good_id = g.id
         WHERE tj2.player_id = ?
         GROUP BY tj2.good_id
         ORDER BY SUM(tj2.quantity) DESC
         LIMIT 1) as most_traded_good
      FROM trade_journal
      WHERE player_id = ?
    `;

    const stats = db.get().prepare(statsQuery).get(playerId, playerId, playerId, playerId);

    res.json({ trades, stats });
  } catch (error) {
    console.error('Error fetching trade journal:', error);
    res.status(500).json({ error: 'Failed to fetch trade journal' });
  }
});

/**
 * GET /api/quartermaster/voyage-logs/:playerId
 * Get voyage logs for a player
 * Query params:
 *   - limit: max records to return (default 50)
 *   - offset: pagination offset (default 0)
 */
router.get('/voyage-logs/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query = `
      SELECT
        vl.id,
        vl.player_id,
        vl.origin_port_id,
        p1.name as origin_port_name,
        vl.destination_port_id,
        p2.name as destination_port_name,
        vl.event_type,
        vl.event_description,
        vl.damage_taken,
        vl.cargo_changes,
        vl.money_change,
        vl.reputation_changes,
        vl.turn_number,
        vl.timestamp
      FROM voyage_logs vl
      JOIN ports p1 ON vl.origin_port_id = p1.id
      JOIN ports p2 ON vl.destination_port_id = p2.id
      WHERE vl.player_id = ?
      ORDER BY vl.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const voyages = db.get().prepare(query).all(playerId, parseInt(limit), parseInt(offset));

    // Get summary statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_voyages,
        SUM(CASE WHEN event_type IS NOT NULL THEN 1 ELSE 0 END) as events_encountered,
        SUM(CASE WHEN event_type = 'storm' THEN 1 ELSE 0 END) as storms,
        SUM(CASE WHEN event_type = 'pirates' THEN 1 ELSE 0 END) as pirate_encounters,
        SUM(CASE WHEN event_type = 'merchant' THEN 1 ELSE 0 END) as merchant_encounters,
        SUM(CASE WHEN event_type = 'patrol' THEN 1 ELSE 0 END) as patrol_encounters,
        SUM(damage_taken) as total_damage
      FROM voyage_logs
      WHERE player_id = ?
    `;

    const stats = db.get().prepare(statsQuery).get(playerId);

    res.json({ voyages, stats });
  } catch (error) {
    console.error('Error fetching voyage logs:', error);
    res.status(500).json({ error: 'Failed to fetch voyage logs' });
  }
});

module.exports = router;
