const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/trade/buy - Buy goods at current port
router.post('/buy', (req, res) => {
  try {
    const { player_id, good_id, quantity } = req.body;

    if (!player_id || !good_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // Use transaction for atomic operation
    const transaction = db.transaction(() => {
      // Get player
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
      if (!player) {
        throw new Error('Player not found');
      }

      // Get port goods
      const portGood = db.prepare(`
        SELECT pg.*, g.volume_per_unit
        FROM port_goods pg
        JOIN goods g ON pg.good_id = g.id
        WHERE pg.port_id = ? AND pg.good_id = ?
      `).get(player.current_port_id, good_id);

      if (!portGood) {
        throw new Error('Good not available at this port');
      }

      // Check stock availability
      if (portGood.stock < quantity) {
        throw new Error(`Insufficient stock. Available: ${portGood.stock}`);
      }

      // Calculate price
      const currentPrice = calculatePrice(
        portGood.stock,
        portGood.stock_capacity,
        portGood.base_price
      );
      const totalCost = currentPrice * quantity;

      // Check player funds
      if (player.money < totalCost) {
        throw new Error(`Insufficient funds. Cost: ${totalCost.toFixed(2)}, Available: ${player.money.toFixed(2)}`);
      }

      // Check cargo capacity
      const ships = db.prepare('SELECT * FROM ships WHERE player_id = ?').all(player_id);
      const totalCapacity = ships.reduce((sum, ship) => sum + ship.max_cargo, 0);

      const currentCargo = db.prepare(`
        SELECT pc.*, g.volume_per_unit
        FROM player_cargo pc
        JOIN goods g ON pc.good_id = g.id
        WHERE pc.player_id = ?
      `).all(player_id);

      const usedCapacity = currentCargo.reduce((sum, item) => {
        return sum + (item.quantity * item.volume_per_unit);
      }, 0);

      const requiredCapacity = quantity * portGood.volume_per_unit;

      if (usedCapacity + requiredCapacity > totalCapacity) {
        throw new Error(`Insufficient cargo space. Required: ${requiredCapacity}, Available: ${totalCapacity - usedCapacity}`);
      }

      // Execute trade
      // 1. Deduct money
      db.prepare('UPDATE players SET money = money - ? WHERE id = ?').run(totalCost, player_id);

      // 2. Reduce port stock
      db.prepare('UPDATE port_goods SET stock = stock - ? WHERE port_id = ? AND good_id = ?')
        .run(quantity, player.current_port_id, good_id);

      // 3. Add to player cargo (or update if exists)
      const existingCargo = db.prepare(`
        SELECT * FROM player_cargo WHERE player_id = ? AND good_id = ?
      `).get(player_id, good_id);

      if (existingCargo) {
        db.prepare('UPDATE player_cargo SET quantity = quantity + ? WHERE id = ?')
          .run(quantity, existingCargo.id);
      } else {
        db.prepare(`
          INSERT INTO player_cargo (player_id, good_id, quantity)
          VALUES (?, ?, ?)
        `).run(player_id, good_id, quantity);
      }

      // 4. Log transaction to trade journal
      db.prepare(`
        INSERT INTO trade_journal (player_id, port_id, good_id, transaction_type, quantity, unit_price, total_amount)
        VALUES (?, ?, ?, 'buy', ?, ?, ?)
      `).run(player_id, player.current_port_id, good_id, quantity, currentPrice, totalCost);

      return {
        success: true,
        transaction: {
          type: 'buy',
          good_id,
          quantity,
          unit_price: currentPrice,
          total_cost: totalCost,
        },
      };
    });

    const result = transaction();
    res.json(result);
  } catch (error) {
    console.error('Error buying goods:', error);
    res.status(400).json({ error: error.message || 'Failed to buy goods' });
  }
});

// POST /api/trade/sell - Sell goods at current port
router.post('/sell', (req, res) => {
  try {
    const { player_id, good_id, quantity } = req.body;

    if (!player_id || !good_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const transaction = db.transaction(() => {
      // Get player
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
      if (!player) {
        throw new Error('Player not found');
      }

      // Get player cargo
      const cargo = db.prepare(`
        SELECT * FROM player_cargo WHERE player_id = ? AND good_id = ?
      `).get(player_id, good_id);

      if (!cargo || cargo.quantity < quantity) {
        throw new Error(`Insufficient cargo. Available: ${cargo ? cargo.quantity : 0}`);
      }

      // Get port goods
      const portGood = db.prepare(`
        SELECT * FROM port_goods WHERE port_id = ? AND good_id = ?
      `).get(player.current_port_id, good_id);

      if (!portGood) {
        throw new Error('Port does not trade this good');
      }

      // Calculate price (after adding stock, so slightly lower sell price)
      const currentPrice = calculatePrice(
        portGood.stock + quantity,
        portGood.stock_capacity,
        portGood.base_price
      );
      const totalRevenue = currentPrice * quantity;

      // Execute trade
      // 1. Add money
      db.prepare('UPDATE players SET money = money + ? WHERE id = ?').run(totalRevenue, player_id);

      // 2. Increase port stock
      db.prepare('UPDATE port_goods SET stock = stock + ? WHERE port_id = ? AND good_id = ?')
        .run(quantity, player.current_port_id, good_id);

      // 3. Remove from player cargo
      const newQuantity = cargo.quantity - quantity;
      if (newQuantity === 0) {
        db.prepare('DELETE FROM player_cargo WHERE id = ?').run(cargo.id);
      } else {
        db.prepare('UPDATE player_cargo SET quantity = ? WHERE id = ?').run(newQuantity, cargo.id);
      }

      // 4. Log transaction to trade journal
      db.prepare(`
        INSERT INTO trade_journal (player_id, port_id, good_id, transaction_type, quantity, unit_price, total_amount)
        VALUES (?, ?, ?, 'sell', ?, ?, ?)
      `).run(player_id, player.current_port_id, good_id, quantity, currentPrice, totalRevenue);

      return {
        success: true,
        transaction: {
          type: 'sell',
          good_id,
          quantity,
          unit_price: currentPrice,
          total_revenue: totalRevenue,
        },
      };
    });

    const result = transaction();
    res.json(result);
  } catch (error) {
    console.error('Error selling goods:', error);
    res.status(400).json({ error: error.message || 'Failed to sell goods' });
  }
});

// Price calculation function (same as ports.js)
function calculatePrice(stock, capacity, basePrice, alpha = 1.0) {
  const r = stock / capacity;
  const m = 1 + alpha * (0.5 - r);
  const price = basePrice * m;
  const minPrice = basePrice * 0.5;
  const maxPrice = basePrice * 2.0;
  return Math.max(minPrice, Math.min(maxPrice, price));
}

module.exports = router;
