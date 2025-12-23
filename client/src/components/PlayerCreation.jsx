import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function PlayerCreation() {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const { createPlayer } = useGame();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createPlayer(name.trim());
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="player-creation">
      <div className="creation-content">
        <h1>Far East Trader</h1>
        <p className="intro">
          Welcome to the Far East. The year is 1650, and the seas of China hold fortune and danger in equal measure.
        </p>

        <form onSubmit={handleSubmit} className="creation-form">
          <h2>Create Your Trader</h2>

          <div className="form-group">
            <label htmlFor="name">Your Name:</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={creating}
              autoFocus
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="starting-info">
            <h3>You will start with:</h3>
            <ul>
              <li>1,000 silver coins</li>
              <li>One small junk (Lucky Dragon)</li>
              <li>100 cargo capacity</li>
              <li>Your port: Canton (Guangzhou)</li>
            </ul>
          </div>

          <button type="submit" disabled={creating} className="primary-button">
            {creating ? 'Creating...' : 'Begin Your Journey'}
          </button>
        </form>
      </div>
    </div>
  );
}
