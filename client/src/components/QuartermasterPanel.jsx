import { useState, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';
import { quartermasterAPI } from '../services/api';
import PriceHistoryTable from './PriceHistoryTable';
import TradeJournalTable from './TradeJournalTable';
import VoyageLogsTable from './VoyageLogsTable';
import './QuartermasterPanel.css';

function QuartermasterPanel() {
  const { player } = useContext(GameContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('trade-journal');
  const [quickStats, setQuickStats] = useState({
    totalTrades: 0,
    totalProfit: 0,
    lastVoyage: 'N/A',
  });

  useEffect(() => {
    if (player && !isExpanded) {
      loadQuickStats();
    }
  }, [player, isExpanded]);

  const loadQuickStats = async () => {
    try {
      // Load quick stats for collapsed view
      const tradeData = await quartermasterAPI.getTradeJournal(player.id, { limit: 1 });
      const voyageData = await quartermasterAPI.getVoyageLogs(player.id, { limit: 1 });

      setQuickStats({
        totalTrades: tradeData.stats?.total_trades || 0,
        totalProfit: tradeData.stats?.net_profit || 0,
        lastVoyage: voyageData.voyages?.[0]
          ? `${voyageData.voyages[0].origin_port_name} → ${voyageData.voyages[0].destination_port_name}`
          : 'N/A',
      });
    } catch (err) {
      console.error('Error loading quick stats:', err);
    }
  };

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  const formatProfit = (profit) => {
    return profit >= 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2);
  };

  return (
    <div className={`quartermaster-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Toggle bar (always visible) */}
      <div className="qm-toggle-bar" onClick={togglePanel}>
        <div className="qm-toggle-content">
          <span className="qm-toggle-icon">📊</span>
          <span className="qm-toggle-title">Quartermaster's Ledger</span>
          {!isExpanded && (
            <div className="qm-quick-stats">
              <span className="qm-quick-stat">
                <strong>Trades:</strong> {quickStats.totalTrades}
              </span>
              <span className="qm-quick-stat">
                <strong>Profit:</strong>{' '}
                <span className={quickStats.totalProfit >= 0 ? 'profit' : 'loss'}>
                  {formatProfit(quickStats.totalProfit)}
                </span>
              </span>
              <span className="qm-quick-stat">
                <strong>Last Voyage:</strong> {quickStats.lastVoyage}
              </span>
            </div>
          )}
          <span className="qm-toggle-arrow">{isExpanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* Expanded panel content */}
      {isExpanded && (
        <div className="qm-panel-content">
          {/* Tab navigation */}
          <div className="qm-tabs">
            <button
              className={`qm-tab ${activeTab === 'trade-journal' ? 'active' : ''}`}
              onClick={() => setActiveTab('trade-journal')}
            >
              Trade Journal
            </button>
            <button
              className={`qm-tab ${activeTab === 'price-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('price-history')}
            >
              Price History
            </button>
            <button
              className={`qm-tab ${activeTab === 'voyage-logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('voyage-logs')}
            >
              Voyage Logs
            </button>
          </div>

          {/* Tab content */}
          <div className="qm-tab-content">
            {activeTab === 'price-history' && <PriceHistoryTable />}
            {activeTab === 'trade-journal' && <TradeJournalTable />}
            {activeTab === 'voyage-logs' && <VoyageLogsTable />}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuartermasterPanel;
