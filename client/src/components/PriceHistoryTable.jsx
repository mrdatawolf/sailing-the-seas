import { useState, useEffect } from 'react';
import { quartermasterAPI } from '../services/api';

function PriceHistoryTable() {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    port_id: '',
    good_id: '',
  });

  useEffect(() => {
    loadPriceHistory();
  }, [filters]);

  const loadPriceHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.port_id) params.port_id = filters.port_id;
      if (filters.good_id) params.good_id = filters.good_id;
      params.limit = 100;

      const data = await quartermasterAPI.getPriceHistory(params);
      setPriceHistory(data.priceHistory || []);
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
    return <div className="qm-loading">Loading price history...</div>;
  }

  if (error) {
    return <div className="qm-error">Error: {error}</div>;
  }

  return (
    <div className="price-history-container">
      <div className="qm-table-header">
        <h3>Price History</h3>
        <p className="qm-subtitle">Track market prices across ports and time</p>
      </div>

      <div className="qm-table-wrapper">
        <table className="qm-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>Good</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {priceHistory.length === 0 ? (
              <tr>
                <td colSpan="6" className="qm-empty">
                  No price history recorded yet. Visit ports and view markets to start tracking prices.
                </td>
              </tr>
            ) : (
              priceHistory.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.port_name}</td>
                  <td>{entry.good_name}</td>
                  <td>
                    <span className={`good-category ${entry.good_category}`}>
                      {entry.good_category}
                    </span>
                  </td>
                  <td className="qm-price">{formatPrice(entry.price)}</td>
                  <td>{entry.stock} / {entry.stock}</td>
                  <td className="qm-date">{formatDate(entry.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PriceHistoryTable;
