import { useGame } from '../context/GameContext';

// Port-specific flavor text and facts
const portData = {
  'Canton (Guangzhou)': {
    weather: 'Humid subtropical climate with monsoon influence',
    population: 'Bustling merchant city of ~200,000 souls',
    culture: 'Center of Qing Dynasty foreign trade, strict regulations',
    industry: 'Tea, silk, and porcelain export hub',
    notable: 'Home to the Thirteen Factories trading district',
  },
  'Macau': {
    weather: 'Warm coastal climate, typhoon season in summer',
    population: 'Portuguese colonial port, ~5,000 residents',
    culture: 'Blend of Portuguese and Chinese traditions',
    industry: 'Gateway for European traders, missionary base',
    notable: 'First European settlement in East Asia',
  },
  'Hong Kong': {
    weather: 'Tropical monsoon, hot and humid summers',
    population: 'Small fishing villages, ~7,000 inhabitants',
    culture: 'Traditional Cantonese fishing communities',
    industry: 'Fishing, small-scale trade, pirate refuge',
    notable: 'Strategic deep-water harbor location',
  },
  'Manila': {
    weather: 'Tropical climate, heavy rainfall during monsoon',
    population: 'Spanish colonial city, ~20,000 people',
    culture: 'Catholic Spanish influence, indigenous Filipino heritage',
    industry: 'Silver trade via Mexican galleons, spice trade',
    notable: 'Gateway to the Pacific galleon trade route',
  },
  'Nagasaki': {
    weather: 'Temperate maritime, mild winters and warm summers',
    population: 'Trading port city, ~65,000 residents',
    culture: 'Isolated Japanese port under Tokugawa Shogunate',
    industry: 'Only authorized foreign trade port in Japan',
    notable: 'Dejima island hosts Dutch trading post',
  },
};

const weatherConditions = [
  'Clear skies with gentle coastal breeze',
  'Overcast with occasional rain showers',
  'Misty morning, clearing by afternoon',
  'Strong winds from the east',
  'Calm seas and pleasant weather',
  'Heavy clouds gathering on horizon',
  'Humid air, storm approaching',
];

export default function PortInfoPanel() {
  const { currentPort } = useGame();

  if (!currentPort) {
    return null;
  }

  const portName = currentPort.port.name;
  const info = portData[portName] || {
    weather: 'Variable coastal weather',
    population: 'Trading settlement',
    culture: 'Merchant community',
    industry: 'Trade and commerce',
    notable: 'Important trading hub',
  };

  // Simple deterministic "random" weather based on port name
  const weatherIndex = portName.length % weatherConditions.length;
  const currentWeather = weatherConditions[weatherIndex];

  return (
    <div className="port-info-panel">
      <h3>Port Information</h3>

      <div className="info-section">
        <div className="info-icon">🌤️</div>
        <div className="info-content">
          <div className="info-label">Current Weather</div>
          <div className="info-text">{currentWeather}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-icon">🌍</div>
        <div className="info-content">
          <div className="info-label">Climate</div>
          <div className="info-text">{info.weather}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-icon">👥</div>
        <div className="info-content">
          <div className="info-label">Population</div>
          <div className="info-text">{info.population}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-icon">🏛️</div>
        <div className="info-content">
          <div className="info-label">Culture</div>
          <div className="info-text">{info.culture}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-icon">⚙️</div>
        <div className="info-content">
          <div className="info-label">Industry</div>
          <div className="info-text">{info.industry}</div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-icon">✨</div>
        <div className="info-content">
          <div className="info-label">Notable</div>
          <div className="info-text">{info.notable}</div>
        </div>
      </div>
    </div>
  );
}
