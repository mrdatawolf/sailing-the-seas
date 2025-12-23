import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function TravelSidebar({ onTravel }) {
  const { currentPort, allPorts } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentPort) {
    return null;
  }

  const connectedPortNames = currentPort.port.connected_ports || [];
  const connectedPorts = allPorts.filter(p => connectedPortNames.includes(p.name));

  const handleTravelClick = (portId, portName) => {
    setIsOpen(false);
    onTravel(portId, portName);
  };

  return (
    <>
      <button
        className={`travel-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Destinations"
      >
        <span className="travel-icon">🧭</span>
        <span className="travel-count">{connectedPorts.length}</span>
      </button>

      <div className={`travel-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="travel-sidebar-header">
          <h2>Destinations</h2>
          <button
            className="close-button"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="travel-sidebar-content">
          <div className="current-location">
            <div className="location-label">Current Port:</div>
            <div className="location-name">{currentPort.port.name}</div>
          </div>

          <div className="destinations-list">
            {connectedPorts.length === 0 ? (
              <p className="no-destinations">No connected ports available</p>
            ) : (
              connectedPorts.map(port => (
                <div key={port.id} className="destination-card">
                  <div className="destination-header">
                    <h3>{port.name}</h3>
                  </div>
                  <div className="destination-info">
                    <div className="info-row">
                      <span className="info-label">Region:</span>
                      <span className="info-value">{port.region}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Faction:</span>
                      <span className="info-value">{port.faction}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Security:</span>
                      <span className="info-value">{port.base_security_level}</span>
                    </div>
                  </div>
                  <button
                    className="sail-button"
                    onClick={() => handleTravelClick(port.id, port.name)}
                  >
                    Set Sail →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isOpen && <div className="travel-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}
