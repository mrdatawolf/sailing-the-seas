import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './BuyGoodModal.css';

export default function BuyGoodModal({ item, onClose, onBuy }) {
  const { playerState } = useGame();
  const [quantity, setQuantity] = useState(1);

  if (!playerState || !item) return null;

  const playerMoney = playerState.player.money;
  const itemPrice = item.current_price;
  const availableStock = item.stock;

  // Calculate max affordable based on money and stock
  const maxAffordable = Math.floor(playerMoney / itemPrice);
  const maxBuyable = Math.min(maxAffordable, availableStock);

  // Calculate total cost
  const totalCost = quantity * itemPrice;

  // Check if purchase is valid
  const canAfford = totalCost <= playerMoney;
  const hasStock = quantity <= availableStock;
  const isValid = canAfford && hasStock && quantity > 0;

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
      setQuantity(0);
    } else {
      setQuantity(value);
    }
  };

  const setMax = () => {
    setQuantity(maxBuyable);
  };

  const handleBuy = () => {
    if (isValid) {
      onBuy(item.good_id, item.good_name, quantity);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Buy {item.good_name}</h2>
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
              <span>Available stock:</span>
              <span>{availableStock}</span>
            </div>
            <div className="info-row">
              <span>Your money:</span>
              <span>{playerMoney.toFixed(2)} silver</span>
            </div>
            <div className="info-row">
              <span>Max you can buy:</span>
              <span className="highlight">{maxBuyable}</span>
            </div>
          </div>

          <div className="quantity-input-group">
            <label htmlFor="quantity">Quantity:</label>
            <div className="quantity-controls">
              <input
                type="number"
                id="quantity"
                min="0"
                max={maxBuyable}
                value={quantity}
                onChange={handleQuantityChange}
                className={!isValid ? 'invalid' : ''}
              />
              <button onClick={setMax} className="max-button">Max</button>
            </div>
            <div className="quantity-range">
              <span>Range: 0 - {maxBuyable}</span>
            </div>
          </div>

          <div className={`total-cost ${!canAfford ? 'error' : ''}`}>
            <span>Total cost:</span>
            <span className="amount">{totalCost.toFixed(2)} silver</span>
          </div>

          {!canAfford && quantity > 0 && (
            <div className="error-message">
              Not enough money! You need {(totalCost - playerMoney).toFixed(2)} more silver.
            </div>
          )}

          {!hasStock && quantity > 0 && (
            <div className="error-message">
              Not enough stock! Only {availableStock} available.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">Cancel</button>
          <button
            onClick={handleBuy}
            className="buy-button"
            disabled={!isValid}
          >
            Buy {quantity > 0 ? `(${quantity})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
