import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { travelAPI } from '../services/api';

export default function TravelScreen({ destinationPortId, destinationName, onComplete }) {
  const { playerState, refreshGameState } = useGame();
  const [traveling, setTraveling] = useState(false);
  const [travelResult, setTravelResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTravel = async () => {
    setTraveling(true);
    setError(null);

    try {
      const result = await travelAPI.travel(playerState.player.id, destinationPortId);
      setTravelResult(result);
      await refreshGameState();
    } catch (err) {
      setError(err.message);
    } finally {
      setTraveling(false);
    }
  };

  const handleContinue = () => {
    onComplete();
  };

  if (!travelResult) {
    return (
      <div className="travel-screen">
        <h1>Travel</h1>
        <div className="travel-confirmation">
          <p>Prepare to sail from <strong>{playerState?.player?.current_port_name}</strong> to <strong>{destinationName}</strong></p>

          <div className="voyage-info">
            <h3>Fleet Status</h3>
            {playerState?.ships.map(ship => (
              <div key={ship.id} className="ship-status">
                <strong>{ship.name}</strong>: Hull {ship.current_hull}/{ship.hull_strength}
              </div>
            ))}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="travel-actions">
            <button
              onClick={handleTravel}
              disabled={traveling}
              className="primary-button"
            >
              {traveling ? 'Sailing...' : 'Set Sail'}
            </button>
            <button onClick={onComplete} disabled={traveling}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-screen">
      <h1>Voyage Complete</h1>

      <div className="travel-result">
        <p className="route">
          {travelResult.origin_port} → {travelResult.destination_port}
        </p>

        {travelResult.event ? (
          <div className="event-result">
            <h2>Event: {travelResult.event.type}</h2>
            <p className={`event-message ${travelResult.event.severity}`}>
              {travelResult.event.message}
            </p>

            {travelResult.event.effects && travelResult.event.effects.length > 0 && (
              <div className="event-effects">
                <h3>Effects:</h3>
                <ul>
                  {travelResult.event.effects.map((effect, idx) => (
                    <li key={idx}>{effect}</li>
                  ))}
                </ul>
              </div>
            )}

            {travelResult.event.blocked && (
              <p className="blocked-warning">
                Your journey was interrupted! You remain at {travelResult.origin_port}.
              </p>
            )}
          </div>
        ) : (
          <div className="no-event">
            <p>The voyage was uneventful. You have arrived safely.</p>
          </div>
        )}

        {travelResult.arrived && (
          <p className="arrival">
            You have arrived at <strong>{travelResult.destination_port}</strong>
          </p>
        )}

        <button onClick={handleContinue} className="primary-button">
          Continue
        </button>
      </div>
    </div>
  );
}
