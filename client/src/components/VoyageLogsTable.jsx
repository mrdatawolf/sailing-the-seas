import { useState, useEffect, useContext } from 'react';
import { quartermasterAPI } from '../services/api';
import { GameContext } from '../context/GameContext';

function VoyageLogsTable() {
  const { player } = useContext(GameContext);
  const [voyages, setVoyages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVoyage, setExpandedVoyage] = useState(null);

  useEffect(() => {
    if (player) {
      loadVoyageLogs();
    }
  }, [player]);

  const loadVoyageLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quartermasterAPI.getVoyageLogs(player.id, { limit: 50 });
      setVoyages(data.voyages || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const toggleExpanded = (voyageId) => {
    setExpandedVoyage(expandedVoyage === voyageId ? null : voyageId);
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'storm': return '⛈️';
      case 'pirates': return '☠️';
      case 'merchant': return '⛵';
      case 'patrol': return '🚢';
      default: return '✓';
    }
  };

  const getEventLabel = (eventType) => {
    if (!eventType) return 'Safe Passage';
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  };

  if (loading) {
    return <div className="qm-loading">Loading voyage logs...</div>;
  }

  if (error) {
    return <div className="qm-error">Error: {error}</div>;
  }

  return (
    <div className="voyage-logs-container">
      <div className="qm-table-header">
        <h3>Voyage Logs</h3>
        <p className="qm-subtitle">History of your travels and events encountered</p>
      </div>

      {stats && (
        <div className="qm-stats">
          <div className="qm-stat-card">
            <div className="qm-stat-label">Total Voyages</div>
            <div className="qm-stat-value">{stats.total_voyages || 0}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Events Encountered</div>
            <div className="qm-stat-value">{stats.events_encountered || 0}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Storms</div>
            <div className="qm-stat-value">⛈️ {stats.storms || 0}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Pirate Encounters</div>
            <div className="qm-stat-value">☠️ {stats.pirate_encounters || 0}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Total Damage</div>
            <div className="qm-stat-value">{stats.total_damage || 0} HP</div>
          </div>
        </div>
      )}

      <div className="qm-table-wrapper">
        <table className="qm-table voyage-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Event</th>
              <th>Damage</th>
              <th>Money Change</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {voyages.length === 0 ? (
              <tr>
                <td colSpan="6" className="qm-empty">
                  No voyages recorded yet. Start traveling between ports to build your voyage history!
                </td>
              </tr>
            ) : (
              voyages.map((voyage) => (
                <>
                  <tr
                    key={voyage.id}
                    className={`voyage-row ${voyage.event_type ? 'has-event' : ''}`}
                    onClick={() => toggleExpanded(voyage.id)}
                  >
                    <td className="voyage-route">
                      {voyage.origin_port_name} → {voyage.destination_port_name}
                    </td>
                    <td>
                      <span className={`event-badge ${voyage.event_type || 'safe'}`}>
                        {getEventIcon(voyage.event_type)} {getEventLabel(voyage.event_type)}
                      </span>
                    </td>
                    <td className={voyage.damage_taken > 0 ? 'damage' : ''}>
                      {voyage.damage_taken > 0 ? `-${voyage.damage_taken} HP` : '-'}
                    </td>
                    <td className={voyage.money_change > 0 ? 'profit' : voyage.money_change < 0 ? 'loss' : ''}>
                      {voyage.money_change !== 0 ? (
                        <>
                          {voyage.money_change > 0 ? '+' : ''}{voyage.money_change.toFixed(2)}
                        </>
                      ) : '-'}
                    </td>
                    <td className="qm-date">{formatDate(voyage.timestamp)}</td>
                    <td className="expand-btn">
                      {voyage.event_description && (expandedVoyage === voyage.id ? '▼' : '▶')}
                    </td>
                  </tr>
                  {expandedVoyage === voyage.id && voyage.event_description && (
                    <tr className="voyage-details">
                      <td colSpan="6">
                        <div className="event-description">
                          <strong>Event Details:</strong>
                          <p>{voyage.event_description}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VoyageLogsTable;
