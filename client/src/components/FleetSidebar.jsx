import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function FleetSidebar() {
  const { playerState } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  if (!playerState) {
    return null;
  }

  return (
    <>
      <button
        className={`fleet-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Fleet"
      >
        <span className="fleet-icon">⚓</span>
        <span className="fleet-count">{playerState.ships.length}</span>
      </button>

      <div className={`fleet-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="fleet-sidebar-header">
          <h2>Your Fleet</h2>
          <button
            className="close-button"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="fleet-sidebar-content">
          {playerState.ships.map(ship => (
            <div key={ship.id} className="fleet-ship-card">
              <h3>{ship.name}</h3>
              <div className="ship-type">{ship.type.replace('_', ' ')}</div>

              <div className="ship-stats">
                <div className="stat-row">
                  <span className="stat-label">Hull:</span>
                  <span className="stat-value">
                    <span className={ship.current_hull < ship.hull_strength * 0.3 ? 'danger' : ''}>
                      {ship.current_hull}
                    </span> / {ship.hull_strength}
                  </span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Cargo:</span>
                  <span className="stat-value">{ship.max_cargo}</span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Guns:</span>
                  <span className="stat-value">{ship.guns}</span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Speed:</span>
                  <span className="stat-value">{ship.speed}</span>
                </div>
              </div>

              {(ship.armor_level > 0 || ship.sail_rigging_level > 0 ||
                ship.cargo_mods_level > 0 || ship.gun_mods_level > 0) && (
                <div className="ship-upgrades">
                  <div className="upgrades-label">Upgrades:</div>
                  {ship.armor_level > 0 && <div className="upgrade">Armor +{ship.armor_level}</div>}
                  {ship.sail_rigging_level > 0 && <div className="upgrade">Sails +{ship.sail_rigging_level}</div>}
                  {ship.cargo_mods_level > 0 && <div className="upgrade">Cargo +{ship.cargo_mods_level}</div>}
                  {ship.gun_mods_level > 0 && <div className="upgrade">Guns +{ship.gun_mods_level}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isOpen && <div className="fleet-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}
