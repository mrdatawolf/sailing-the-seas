import { useGame } from '../context/GameContext';

export default function FleetVisualization() {
  const { playerState } = useGame();

  if (!playerState) {
    return null;
  }

  // Simple pixel art representation of ships
  const renderShip = (ship, index) => {
    const hullPercent = (ship.current_hull / ship.hull_strength) * 100;
    const isDamaged = hullPercent < 70;
    const isCritical = hullPercent < 30;

    return (
      <div key={ship.id} className="pixel-ship" style={{ animationDelay: `${index * 0.2}s` }}>
        <div className="ship-pixel-art">
          <div className="ship-sails">
            <div className="sail"></div>
            <div className="sail"></div>
          </div>
          <div className={`ship-hull ${isDamaged ? 'damaged' : ''} ${isCritical ? 'critical' : ''}`}>
            <div className="hull-body"></div>
            <div className="hull-deck"></div>
          </div>
          <div className="ship-waves">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
        </div>
        <div className="ship-name-tag">{ship.name}</div>
        {isDamaged && (
          <div className="ship-status-indicator">
            {isCritical ? '🔥' : '⚠️'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fleet-visualization">
      <h3>Your Fleet at Port</h3>
      <div className="harbor-scene">
        <div className="harbor-background">
          <div className="harbor-sky"></div>
          <div className="harbor-water"></div>
          <div className="harbor-dock"></div>
        </div>
        <div className="ships-container">
          {playerState.ships.map((ship, index) => renderShip(ship, index))}
        </div>
      </div>
      <div className="fleet-summary">
        <div className="summary-item">
          <span className="summary-label">Total Ships:</span>
          <span className="summary-value">{playerState.ships.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Guns:</span>
          <span className="summary-value">
            {playerState.ships.reduce((sum, ship) => sum + ship.guns, 0)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Cargo:</span>
          <span className="summary-value">{playerState.totalCargoCapacity}</span>
        </div>
      </div>
    </div>
  );
}
