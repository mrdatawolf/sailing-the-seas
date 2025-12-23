const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/travel - Travel to destination port
router.post('/', (req, res) => {
  try {
    const { player_id, destination_port_id } = req.body;

    if (!player_id || !destination_port_id) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const transaction = db.transaction(() => {
      // Get player
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
      if (!player) {
        throw new Error('Player not found');
      }

      // Get origin port
      const originPort = db.prepare('SELECT * FROM ports WHERE id = ?').get(player.current_port_id);
      const connectedPorts = JSON.parse(originPort.connected_ports_json || '[]');

      // Get destination port
      const destPort = db.prepare('SELECT * FROM ports WHERE id = ?').get(destination_port_id);
      if (!destPort) {
        throw new Error('Destination port not found');
      }

      // Validate route exists
      if (!connectedPorts.includes(destPort.name)) {
        throw new Error('No direct route to destination port');
      }

      // Roll for travel event (simplified for MVP)
      const event = rollForEvent(player, originPort, destPort);

      let eventResult = null;
      if (event) {
        eventResult = resolveEvent(event, player_id);
      }

      // Move player to destination (unless event blocked it)
      if (!eventResult || !eventResult.blocked) {
        db.prepare('UPDATE players SET current_port_id = ? WHERE id = ?')
          .run(destination_port_id, player_id);
      }

      // Log voyage to voyage_logs
      const eventDescription = eventResult ? eventResult.message + ' ' + eventResult.effects.join(', ') : 'Safe passage';
      const damageTaken = eventResult && eventResult.effects ?
        eventResult.effects.filter(e => e.includes('hull damage')).length * 10 : 0;
      const moneyChange = eventResult && eventResult.effects ?
        eventResult.effects.reduce((sum, e) => {
          const gainMatch = e.match(/Gained (\d+) silver/);
          const lostMatch = e.match(/Lost (\d+) silver/);
          const fineMatch = e.match(/Paid (\d+) silver/);
          if (gainMatch) return sum + parseInt(gainMatch[1]);
          if (lostMatch) return sum - parseInt(lostMatch[1]);
          if (fineMatch) return sum - parseInt(fineMatch[1]);
          return sum;
        }, 0) : 0;

      db.prepare(`
        INSERT INTO voyage_logs (
          player_id, origin_port_id, destination_port_id, event_type,
          event_description, damage_taken, money_change
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        player_id,
        player.current_port_id,
        destination_port_id,
        eventResult ? eventResult.type : null,
        eventDescription,
        damageTaken,
        moneyChange
      );

      return {
        success: true,
        origin_port: originPort.name,
        destination_port: destPort.name,
        arrived: !eventResult || !eventResult.blocked,
        event: eventResult,
      };
    });

    const result = transaction();
    res.json(result);
  } catch (error) {
    console.error('Error during travel:', error);
    res.status(400).json({ error: error.message || 'Failed to travel' });
  }
});

// Roll for random event during travel
function rollForEvent(player, originPort, destPort) {
  // Base event chance: 30%
  const baseEventChance = 0.3;

  // Modifiers based on security levels
  const avgSecurity = (originPort.base_security_level + destPort.base_security_level) / 2;
  const securityModifier = (100 - avgSecurity) / 100; // Lower security = higher chance

  // Reputation modifier (higher pirate rep = more encounters)
  const pirateReputation = player.pirate_reputation || 0;
  const reputationModifier = 1 + (pirateReputation / 100);

  const finalChance = baseEventChance * securityModifier * reputationModifier;

  if (Math.random() < finalChance) {
    // Event occurred - determine type
    const eventTypes = ['storm', 'pirates', 'merchant', 'patrol'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    return {
      type: eventType,
      severity: Math.random() < 0.5 ? 'minor' : 'major',
    };
  }

  return null;
}

// Resolve event outcome
function resolveEvent(event, playerId) {
  const ships = db.prepare('SELECT * FROM ships WHERE player_id = ?').all(playerId);

  if (ships.length === 0) {
    return { blocked: true, message: 'No ships available' };
  }

  const result = {
    type: event.type,
    severity: event.severity,
    blocked: false,
    message: '',
    effects: [],
  };

  switch (event.type) {
    case 'storm':
      // Storm damages ships
      const damagePercent = event.severity === 'major' ? 0.3 : 0.1;
      ships.forEach(ship => {
        const damage = Math.floor(ship.hull_strength * damagePercent);
        const newHull = Math.max(1, ship.current_hull - damage);
        db.prepare('UPDATE ships SET current_hull = ? WHERE id = ?').run(newHull, ship.id);
        result.effects.push(`${ship.name} took ${damage} hull damage`);
      });
      result.message = `A ${event.severity} storm hit your fleet!`;
      break;

    case 'pirates':
      // Pirates attack - simplified combat
      const totalGuns = ships.reduce((sum, ship) => sum + ship.guns, 0);
      const pirateStrength = event.severity === 'major' ? 15 : 8;

      if (totalGuns > pirateStrength) {
        // Victory
        const loot = Math.floor(Math.random() * 200) + 100;
        db.prepare('UPDATE players SET money = money + ? WHERE id = ?').run(loot, playerId);
        result.message = 'Pirates attacked but you drove them off!';
        result.effects.push(`Gained ${loot} silver from captured loot`);
      } else {
        // Defeat - lose money and take damage
        const stolenMoney = Math.floor(Math.random() * 300) + 100;
        db.prepare('UPDATE players SET money = CASE WHEN money < ? THEN 0 ELSE money - ? END WHERE id = ?')
          .run(stolenMoney, stolenMoney, playerId);
        result.message = 'Pirates overwhelmed your fleet!';
        result.effects.push(`Lost ${stolenMoney} silver`);

        // Take damage
        ships.forEach(ship => {
          const damage = Math.floor(ship.hull_strength * 0.2);
          const newHull = Math.max(1, ship.current_hull - damage);
          db.prepare('UPDATE ships SET current_hull = ? WHERE id = ?').run(newHull, ship.id);
          result.effects.push(`${ship.name} took ${damage} hull damage`);
        });
      }
      break;

    case 'merchant':
      // Friendly merchant encounter - opportunity to trade
      result.message = 'You encountered a friendly merchant vessel';
      result.effects.push('A trading opportunity at sea (future feature)');
      break;

    case 'patrol':
      // Naval patrol inspection
      const lawfulRep = db.prepare('SELECT lawful_reputation FROM players WHERE id = ?').get(playerId).lawful_reputation;

      if (lawfulRep < 30) {
        // Suspicious - pay fine
        const fine = 100;
        db.prepare('UPDATE players SET money = CASE WHEN money < ? THEN 0 ELSE money - ? END WHERE id = ?')
          .run(fine, fine, playerId);
        result.message = 'Naval patrol inspected your ship';
        result.effects.push(`Paid ${fine} silver in fines`);
      } else {
        result.message = 'Naval patrol waved you through';
        result.effects.push('All clear!');
      }
      break;

    default:
      result.message = 'An unknown event occurred';
  }

  return result;
}

module.exports = router;
