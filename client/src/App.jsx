import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import PlayerCreation from './components/PlayerCreation';
import PlayerStatusBar from './components/PlayerStatusBar';
import FleetSidebar from './components/FleetSidebar';
import TravelSidebar from './components/TravelSidebar';
import PortScreen from './components/PortScreen';
import TravelScreen from './components/TravelScreen';
import './App.css';

function GameContent() {
  const { playerId, playerState, loading, resetGame } = useGame();
  const [screen, setScreen] = useState('port'); // 'port' | 'travel'
  const [travelDestination, setTravelDestination] = useState(null);

  const handleTravel = (portId, portName) => {
    setTravelDestination({ id: portId, name: portName });
    setScreen('travel');
  };

  const handleTravelComplete = () => {
    setTravelDestination(null);
    setScreen('port');
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to start a new game? This will delete your current progress.')) {
      resetGame();
    }
  };

  if (!playerId) {
    return <PlayerCreation />;
  }

  if (loading && !playerState) {
    return (
      <div className="loading-screen">
        <h1>Loading game...</h1>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="header-title">
          <h1>Far East Trader</h1>
          <button onClick={handleResetGame} className="reset-button">
            New Game
          </button>
        </div>
        <PlayerStatusBar />
      </header>

      <FleetSidebar />
      <TravelSidebar onTravel={handleTravel} />

      <main className="game-content">
        {screen === 'port' && <PortScreen onTravel={handleTravel} />}
        {screen === 'travel' && travelDestination && (
          <TravelScreen
            destinationPortId={travelDestination.id}
            destinationName={travelDestination.name}
            onComplete={handleTravelComplete}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
