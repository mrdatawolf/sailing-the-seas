# Far East Trader

A turn-based trading game set in the 17th century Far East, built with Vite + React frontend and Express + SQLite backend.

## Project Structure

```
sailing-the-seas/
├── client/          # Vite + React frontend
│   ├── src/
│   └── package.json
├── server/          # Express + SQLite backend
│   ├── src/
│   │   ├── db/      # Database schema and seed data
│   │   ├── routes/  # API endpoints
│   │   └── index.js # Express server
│   └── package.json
└── package.json     # Root package scripts
```

## Installation

Install all dependencies:

```bash
npm run install:all
```

Or install manually:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

### Development Mode

Run both frontend and backend together:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend (http://localhost:3001)
npm run dev:server

# Terminal 2 - Frontend (http://localhost:3000)
npm run dev:client
```

The frontend will automatically proxy API requests to the backend.

## API Endpoints

All API endpoints are available at `http://localhost:3001/api`

### Player
- `POST /api/player/create` - Create a new player
- `GET /api/player/:id` - Get player state

### Ports
- `GET /api/ports` - Get all ports
- `GET /api/ports/:id` - Get port details with market data

### Trade
- `POST /api/trade/buy` - Buy goods at current port
- `POST /api/trade/sell` - Sell goods at current port

### Travel
- `POST /api/travel` - Travel to destination port

## Technology Stack

**Frontend:**
- Vite
- React
- Modern JavaScript

**Backend:**
- Express.js
- better-sqlite3 (SQLite database)
- CORS for cross-origin requests

## Game Features (MVP)

- Turn-based trading between Far East ports
- Dynamic price system based on supply/demand
- Fleet management with ship stats
- Travel events (storms, pirates, merchants, patrols)
- Reputation system (lawful vs pirate)
- Persistent SQLite database

See [ARCITECTURE.md](./ARCITECTURE.md) for complete game design documentation.

## Database

The SQLite database is automatically created and seeded on first run. Located at `server/data/game.db`.

Initial seed data includes:
- 6 trade goods (Tea, Silk, Spices, Porcelain, Opium, Silver)
- 5 ports (Canton, Macau, Hong Kong, Manila, Nagasaki)
- Dynamic market data for each port

## License

ISC
