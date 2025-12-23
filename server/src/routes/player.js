const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/player/create - Create a new player
router.post('/create', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Start at Canton (Guangzhou) - port_id 1
    const startingPortId = 1;
    const startingMoney = 1000.0;

    // Insert player
    const insertPlayer = db.prepare(`
      INSERT INTO players (name, current_port_id, money, lawful_reputation, pirate_reputation)
      VALUES (?, ?, ?, ?, ?)
    `);

    const playerResult = insertPlayer.run(name, startingPortId, startingMoney, 50.0, 0.0);
    const playerId = playerResult.lastInsertRowid;

    // Create starting ship (small junk)
    const insertShip = db.prepare(`
      INSERT INTO ships (player_id, name, type, max_cargo, speed, hull_strength, current_hull, guns)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertShip.run(
      playerId,
      'Lucky Dragon',
      'small_junk',
      100, // max_cargo
      50,  // speed
      100, // hull_strength
      100, // current_hull
      2    // guns
    );

    // Get full player state
    const playerState = getPlayerState(playerId);

    res.status(201).json(playerState);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// GET /api/player/:id - Get player state
router.get('/:id', (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const playerState = getPlayerState(playerId);

    if (!playerState) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(playerState);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Helper function to get complete player state
function getPlayerState(playerId) {
  // Get player
  const player = db.prepare(`
    SELECT p.*, ports.name as current_port_name
    FROM players p
    JOIN ports ON p.current_port_id = ports.id
    WHERE p.id = ?
  `).get(playerId);

  if (!player) {
    return null;
  }

  // Parse JSON fields
  player.faction_reputation = JSON.parse(player.faction_reputation_json || '{}');
  delete player.faction_reputation_json;

  // Get ships
  const ships = db.prepare(`
    SELECT * FROM ships WHERE player_id = ?
  `).all(playerId);

  // Get cargo
  const cargo = db.prepare(`
    SELECT pc.*, g.name as good_name, g.volume_per_unit
    FROM player_cargo pc
    JOIN goods g ON pc.good_id = g.id
    WHERE pc.player_id = ?
  `).all(playerId);

  // Calculate total cargo used
  const totalCargoUsed = cargo.reduce((sum, item) => {
    return sum + (item.quantity * item.volume_per_unit);
  }, 0);

  const totalCargoCapacity = ships.reduce((sum, ship) => sum + ship.max_cargo, 0);

  return {
    player,
    ships,
    cargo,
    totalCargoUsed,
    totalCargoCapacity,
  };
}

module.exports = router;
