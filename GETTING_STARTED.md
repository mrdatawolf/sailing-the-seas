# Getting Started with Far East Trader

Your game is now fully set up and running!

## Current Status

✅ **Backend Server** running on http://localhost:3001
✅ **Frontend App** running on http://localhost:3000

## What You Can Do Now

1. **Open the game**: Navigate to http://localhost:3000 in your browser

2. **Create your first player**:
   - Enter your trader name
   - You'll start in Canton (Guangzhou) with:
     - 1,000 silver coins
     - One small junk ship (Lucky Dragon)
     - 100 cargo capacity

3. **Start Trading**:
   - View the market at your current port
   - Buy goods when stock is high (lower prices)
   - Sell goods when stock is low (higher prices)
   - Watch your cargo capacity

4. **Travel Between Ports**:
   - Choose a destination from connected ports
   - Risk random events: storms, pirates, merchants, patrols
   - Arrive at new ports with different markets

## Game Features Implemented

### Core Gameplay
- ✅ Player creation and persistent state
- ✅ 5 ports to trade between (Canton, Macau, Hong Kong, Manila, Nagasaki)
- ✅ 6 trade goods (Tea, Silk, Spices, Porcelain, Opium, Silver)
- ✅ Dynamic pricing based on supply/demand
- ✅ Buy/sell validation (funds, cargo space, stock)

### Fleet Management
- ✅ Ship stats (hull, cargo, guns, speed)
- ✅ Hull damage from events
- ✅ Multiple ships per player (backend ready)

### Travel & Events
- ✅ Travel between connected ports
- ✅ Random events:
  - **Storms**: Damage your ships
  - **Pirates**: Combat based on your guns (win loot, lose money/hull)
  - **Merchants**: Friendly encounters
  - **Patrols**: Inspections based on reputation

### Economy
- ✅ Dynamic market prices
- ✅ Stock depletion when you buy
- ✅ Stock increases when you sell
- ✅ Different port specializations

### Reputation System
- ✅ Lawful vs Pirate reputation tracking
- ✅ Faction reputation (stored, not fully used yet)
- ✅ Affects patrol encounters

## Development Commands

### Run both servers:
```bash
npm run dev
```

### Run servers separately:
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### Stop servers:
- Press `Ctrl+C` in each terminal

## Database

The SQLite database is located at:
```
server/data/game.db
```

To reset the game data, delete this file and restart the server.

## Next Steps for Development

Based on your [ARCITECTURE.md](./ARCITECTURE.md), here are features you could add next:

1. **Fleet Upgrades** - Implement fleet-wide upgrade system
2. **Ship Repairs** - Add repair functionality at ports
3. **More Ports** - Expand to additional trade zones
4. **Missions/Contracts** - Add delivery quests
5. **Loans** - Financial risk/reward mechanics
6. **Better Combat** - More detailed tactical choices
7. **Faction Politics** - Port access restrictions, special deals
8. **Better UI** - Improved styling, animations, charts

## Troubleshooting

**Frontend can't connect to backend:**
- Check that backend is running on port 3001
- Check console for CORS errors

**Database errors:**
- Delete `server/data/game.db` and restart
- Check server logs for details

**Port already in use:**
- Change PORT in `server/.env` (create from `.env.example`)
- Change port in `client/vite.config.js`

## Architecture

- **Frontend**: React + Vite (port 3000)
  - API calls via `/api` proxy to backend
  - State managed with React Context
  - LocalStorage for player ID persistence

- **Backend**: Express + SQLite (port 3001)
  - RESTful API endpoints
  - Server-authoritative game logic
  - Transactional database operations

All communication is via API calls - clean separation between frontend and backend!
