import { useGame } from '../context/GameContext';

export default function PlayerStatusBar() {
  const { playerState } = useGame();

  if (!playerState) {
    return null;
  }

  return (
    <div className="player-status-bar">
      <div className="status-group">
        <span className="status-label">Money:</span>
        <span className="status-value money">{playerState.player.money.toFixed(2)} silver</span>
      </div>

      <div className="status-group">
        <span className="status-label">Cargo:</span>
        <span className="status-value">{playerState.totalCargoUsed} / {playerState.totalCargoCapacity}</span>
      </div>

      <div className="status-group">
        <span className="status-label">Location:</span>
        <span className="status-value">{playerState.player.current_port_name}</span>
      </div>

      <div className="status-group">
        <span className="status-label">Lawful:</span>
        <span className="status-value lawful">{playerState.player.lawful_reputation.toFixed(0)}</span>
      </div>

      <div className="status-group">
        <span className="status-label">Pirate:</span>
        <span className="status-value pirate">{playerState.player.pirate_reputation.toFixed(0)}</span>
      </div>

      <div className="status-group">
        <span className="status-label">Ships:</span>
        <span className="status-value">{playerState.ships.length}</span>
      </div>
    </div>
  );
}
