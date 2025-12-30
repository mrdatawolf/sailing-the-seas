import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { tradeAPI } from '../services/api';
import PortInfoPanel from './PortInfoPanel';
import FleetVisualization from './FleetVisualization';
import QuartermasterPanel from './QuartermasterPanel';
import BuyGoodModal from './BuyGoodModal';
import SellGoodModal from './SellGoodModal';

export default function PortScreen({ onTravel }) {
  const { playerState, currentPort, refreshGameState, allPorts } = useGame();
  const [tradeError, setTradeError] = useState(null);
  const [tradeSuccess, setTradeSuccess] = useState(null);
  const [buyModalItem, setBuyModalItem] = useState(null);
  const [sellModalItem, setSellModalItem] = useState(null);

  if (!playerState || !currentPort) {
    return <div>Loading port information...</div>;
  }

  const openBuyModal = (item) => {
    setBuyModalItem(item);
  };

  const closeBuyModal = () => {
    setBuyModalItem(null);
  };

  const openSellModal = (item) => {
    setSellModalItem(item);
  };

  const closeSellModal = () => {
    setSellModalItem(null);
  };

  const handleBuy = async (goodId, goodName, quantity) => {
    setTradeError(null);
    setTradeSuccess(null);

    try {
      const result = await tradeAPI.buy(playerState.player.id, goodId, quantity);
      setTradeSuccess(`Bought ${quantity} ${goodName} for ${result.transaction.total_cost.toFixed(2)} silver`);
      await refreshGameState();
    } catch (err) {
      setTradeError(err.message);
    }
  };

  const handleSell = async (goodId, goodName, quantity) => {
    setTradeError(null);
    setTradeSuccess(null);

    try {
      const result = await tradeAPI.sell(playerState.player.id, goodId, quantity);
      setTradeSuccess(`Sold ${quantity} ${goodName} for ${result.transaction.total_revenue.toFixed(2)} silver`);
      await refreshGameState();
    } catch (err) {
      setTradeError(err.message);
    }
  };

  const getCargoQuantity = (goodId) => {
    const cargoItem = playerState.cargo.find(c => c.good_id === goodId);
    return cargoItem ? cargoItem.quantity : 0;
  };

  // Get connected port IDs from current port
  const connectedPortNames = currentPort.port.connected_ports || [];
  const connectedPorts = allPorts.filter(p => connectedPortNames.includes(p.name));

  return (
    <div className="port-screen-layout">
      <aside className="left-panel">
        <PortInfoPanel />
      </aside>

      <main className="center-panel">
        <div className="port-screen">
          <h1>{currentPort.port.name}</h1>
          <p className="port-info">
            {currentPort.port.region} | {currentPort.port.faction} | Security: {currentPort.port.base_security_level}
          </p>

          {tradeError && <div className="error">{tradeError}</div>}
          {tradeSuccess && <div className="success">{tradeSuccess}</div>}

          <div className="market">
        <h2>Market</h2>
        <table>
          <thead>
            <tr>
              <th>Good</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>You Have</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPort.market.map(item => (
              <tr key={item.id}>
                <td>{item.good_name}</td>
                <td className={`category-${item.category}`}>{item.category}</td>
                <td>{item.stock} / {item.stock_capacity}</td>
                <td>{item.current_price.toFixed(2)}</td>
                <td>{getCargoQuantity(item.good_id)}</td>
                <td>
                  <button
                    onClick={() => openBuyModal(item)}
                    disabled={item.stock === 0}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => openSellModal(item)}
                    disabled={getCargoQuantity(item.good_id) === 0}
                  >
                    Sell
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div>
      </main>

      <aside className="right-panel">
        <FleetVisualization />
      </aside>

      {/* Quartermaster Panel - bottom collapsible panel */}
      <QuartermasterPanel />

      {/* Buy Modal */}
      {buyModalItem && (
        <BuyGoodModal
          item={buyModalItem}
          onClose={closeBuyModal}
          onBuy={handleBuy}
        />
      )}

      {/* Sell Modal */}
      {sellModalItem && (
        <SellGoodModal
          item={sellModalItem}
          onClose={closeSellModal}
          onSell={handleSell}
        />
      )}
    </div>
  );
}
