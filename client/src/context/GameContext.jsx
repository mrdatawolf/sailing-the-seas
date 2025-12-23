import { createContext, useContext, useState, useEffect } from 'react';
import { playerAPI, portsAPI } from '../services/api';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [playerId, setPlayerId] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [currentPort, setCurrentPort] = useState(null);
  const [allPorts, setAllPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load player ID from localStorage on mount
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('playerId');
    if (savedPlayerId) {
      setPlayerId(parseInt(savedPlayerId));
    }
  }, []);

  // Load player state when playerId changes
  useEffect(() => {
    if (playerId) {
      loadPlayerState();
      loadAllPorts();
    }
  }, [playerId]);

  // Load current port when player state changes
  useEffect(() => {
    if (playerState?.player?.current_port_id) {
      loadCurrentPort(playerState.player.current_port_id);
    }
  }, [playerState?.player?.current_port_id]);

  const createPlayer = async (name) => {
    setLoading(true);
    setError(null);
    try {
      const result = await playerAPI.create(name);
      const newPlayerId = result.player.id;
      setPlayerId(newPlayerId);
      setPlayerState(result);
      localStorage.setItem('playerId', newPlayerId.toString());
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerState = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await playerAPI.get(playerId);
      setPlayerState(result);
    } catch (err) {
      setError(err.message);
      // If player not found, clear localStorage
      if (err.status === 404) {
        localStorage.removeItem('playerId');
        setPlayerId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPort = async (portId) => {
    try {
      const result = await portsAPI.get(portId);
      setCurrentPort(result);
    } catch (err) {
      console.error('Failed to load port:', err);
    }
  };

  const loadAllPorts = async () => {
    try {
      const result = await portsAPI.getAll();
      setAllPorts(result);
    } catch (err) {
      console.error('Failed to load ports:', err);
    }
  };

  const refreshGameState = async () => {
    if (playerId) {
      await loadPlayerState();
    }
  };

  const resetGame = () => {
    localStorage.removeItem('playerId');
    setPlayerId(null);
    setPlayerState(null);
    setCurrentPort(null);
    setAllPorts([]);
    setError(null);
  };

  const value = {
    playerId,
    playerState,
    currentPort,
    allPorts,
    loading,
    error,
    createPlayer,
    loadPlayerState,
    refreshGameState,
    resetGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
