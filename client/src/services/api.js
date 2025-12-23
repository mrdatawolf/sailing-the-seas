// API service layer for backend communication

const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0, { originalError: error.message });
  }
}

export const playerAPI = {
  create: (name) => {
    return fetchAPI('/player/create', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  get: (playerId) => {
    return fetchAPI(`/player/${playerId}`);
  },
};

export const portsAPI = {
  getAll: () => {
    return fetchAPI('/ports');
  },

  get: (portId) => {
    return fetchAPI(`/ports/${portId}`);
  },
};

export const tradeAPI = {
  buy: (playerId, goodId, quantity) => {
    return fetchAPI('/trade/buy', {
      method: 'POST',
      body: JSON.stringify({
        player_id: playerId,
        good_id: goodId,
        quantity,
      }),
    });
  },

  sell: (playerId, goodId, quantity) => {
    return fetchAPI('/trade/sell', {
      method: 'POST',
      body: JSON.stringify({
        player_id: playerId,
        good_id: goodId,
        quantity,
      }),
    });
  },
};

export const travelAPI = {
  travel: (playerId, destinationPortId) => {
    return fetchAPI('/travel', {
      method: 'POST',
      body: JSON.stringify({
        player_id: playerId,
        destination_port_id: destinationPortId,
      }),
    });
  },
};

export const quartermasterAPI = {
  getPriceHistory: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.port_id) queryParams.append('port_id', params.port_id);
    if (params.good_id) queryParams.append('good_id', params.good_id);
    if (params.limit) queryParams.append('limit', params.limit);

    const queryString = queryParams.toString();
    return fetchAPI(`/quartermaster/price-history${queryString ? '?' + queryString : ''}`);
  },

  getTradeJournal: (playerId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.good_id) queryParams.append('good_id', params.good_id);
    if (params.port_id) queryParams.append('port_id', params.port_id);
    if (params.type) queryParams.append('type', params.type);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);

    const queryString = queryParams.toString();
    return fetchAPI(`/quartermaster/trade-journal/${playerId}${queryString ? '?' + queryString : ''}`);
  },

  getVoyageLogs: (playerId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);

    const queryString = queryParams.toString();
    return fetchAPI(`/quartermaster/voyage-logs/${playerId}${queryString ? '?' + queryString : ''}`);
  },
};
