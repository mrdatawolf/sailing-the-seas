import { useState, useEffect } from 'react';
import { quartermasterAPI } from '../services/api';
import { useGame } from '../context/GameContext';

function TradeJournalTable() {
  const { playerState } = useGame();
  const player = playerState?.player;
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (player) {
      loadTradeJournal();
    }
  }, [player]);

  const loadTradeJournal = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quartermasterAPI.getTradeJournal(player.id, { limit: 50 });
      setTrades(data.trades || []);
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

  const formatPrice = (price) => {
    return price.toFixed(2);
  };

  if (loading) {
    return <div className="qm-loading">Loading trade journal...</div>;
  }

  if (error) {
    return <div className="qm-error">Error: {error}</div>;
  }

  return (
    <div className="trade-journal-container">
      <div className="qm-table-header">
        <h3>Trade Journal</h3>
        <p className="qm-subtitle">Complete record of all your transactions</p>
      </div>

      {stats && (
        <div className="qm-stats">
          <div className="qm-stat-card">
            <div className="qm-stat-label">Total Trades</div>
            <div className="qm-stat-value">{stats.total_trades || 0}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Net Profit</div>
            <div className={`qm-stat-value ${stats.net_profit >= 0 ? 'profit' : 'loss'}`}>
              {stats.net_profit >= 0 ? '+' : ''}{formatPrice(stats.net_profit || 0)}
            </div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Most Profitable Good</div>
            <div className="qm-stat-value">{stats.most_profitable_good || 'N/A'}</div>
          </div>
          <div className="qm-stat-card">
            <div className="qm-stat-label">Most Traded Good</div>
            <div className="qm-stat-value">{stats.most_traded_good || 'N/A'}</div>
          </div>
        </div>
      )}

      <div className="qm-table-wrapper">
        <table className="qm-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Port</th>
              <th>Good</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="7" className="qm-empty">
                  No trades recorded yet. Start buying and selling to build your trade history!
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className={`trade-${trade.transaction_type}`}>
                  <td>
                    <span className={`trade-type ${trade.transaction_type}`}>
                      {trade.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td>{trade.port_name}</td>
                  <td>
                    {trade.good_name}
                    <span className={`good-category-tag ${trade.good_category}`}>
                      {trade.good_category}
                    </span>
                  </td>
                  <td>{trade.quantity}</td>
                  <td className="qm-price">{formatPrice(trade.unit_price)}</td>
                  <td className={`qm-total ${trade.transaction_type}`}>
                    {trade.transaction_type === 'sell' ? '+' : '-'}{formatPrice(trade.total_amount)}
                  </td>
                  <td className="qm-date">{formatDate(trade.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TradeJournalTable;
