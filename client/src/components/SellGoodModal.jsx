import { useState } from 'react';
import { useGame } from '../context/GameContext';
import './SellGoodModal.css';

export default function SellGoodModal({ item, onClose, onSell }) {
  const { playerState } = useGame();
  const [quantity, setQuantity] = useState(1);

  if (!playerState || !item) return null;

  const itemPrice = item.current_price;

  // Get how much player has in cargo
  const cargoItem = playerState.cargo.find(c => c.good_id === item.good_id);
  const playerHas = cargoItem ? cargoItem.quantity : 0;

  // Calculate max sellable (what player has)
  const maxSellable = playerHas;

  // Calculate total revenue
  const totalRevenue = quantity * itemPrice;

  // Check if sale is valid
  const hasEnough = quantity <= playerHas;
  const isValid = hasEnough && quantity > 0;

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
      setQuantity(0);
    } else {
      setQuantity(value);
    }
  };

  const setMax = () => {
    setQuantity(maxSellable);
  };

  const handleSell = () => {
    if (isValid) {
      onSell(item.good_id, item.good_name, quantity);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sell-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sell {item.good_name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="trade-info">
            <div className="info-row">
              <span>Category:</span>
              <span className={`category-${item.category}`}>{item.category}</span>
            </div>
            <div className="info-row">
              <span>Price per unit:</span>
              <span>{itemPrice.toFixed(2)} silver</span>
            </div>
            <div className="info-row">
              <span>You have in cargo:</span>
              <span className="highlight">{playerHas}</span>
            </div>
            <div className="info-row">
              <span>Port will accept:</span>
              <span>{item.stock_capacity - item.stock} more (capacity: {item.stock_capacity})</span>
            </div>
          </div>

          <div className="quantity-input-group">
            <label htmlFor="quantity">Quantity to sell:</label>
            <div className="quantity-controls">
              <input
                type="number"
                id="quantity"
                min="0"
                max={maxSellable}
                value={quantity}
                onChange={handleQuantityChange}
                className={!isValid ? 'invalid' : ''}
              />
              <button onClick={setMax} className="max-button" disabled={maxSellable === 0}>
                Max
              </button>
            </div>
            <div className="quantity-range">
              <span>Range: 0 - {maxSellable}</span>
            </div>
          </div>

          <div className={`total-revenue ${!hasEnough ? 'error' : ''}`}>
            <span>Total revenue:</span>
            <span className="amount">{totalRevenue.toFixed(2)} silver</span>
          </div>

          {!hasEnough && quantity > 0 && (
            <div className="error-message">
              You don't have enough! You only have {playerHas} in cargo.
            </div>
          )}

          {playerHas === 0 && (
            <div className="info-message">
              You don't have any {item.good_name} to sell.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">Cancel</button>
          <button
            onClick={handleSell}
            className="sell-button"
            disabled={!isValid}
          >
            Sell {quantity > 0 ? `(${quantity})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
