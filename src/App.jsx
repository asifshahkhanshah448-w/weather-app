import { useState, useEffect } from 'react';

/**
 * Maps Open-Meteo weather codes to human-readable condition names and matching emojis.
 * @param {number} code - Open-Meteo WMO weather code
 * @returns {{ description: string, icon: string }}
 */
function getWeatherDetails(code) {
  switch (code) {
    case 0:
      return { description: 'Clear Sky', icon: '☀️' };
    case 1:
      return { description: 'Mainly Clear', icon: '🌤️' };
    case 2:
      return { description: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { description: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { description: 'Fog', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { description: 'Drizzle', icon: '🌦️' };
    case 56:
    case 57:
      return { description: 'Freezing Drizzle', icon: '🌨️' };
    case 61:
    case 63:
    case 65:
      return { description: 'Rain', icon: '🌧️' };
    case 66:
    case 67:
      return { description: 'Freezing Rain', icon: '🌨️' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { description: 'Snow', icon: '❄️' };
    case 80:
    case 81:
    case 82:
      return { description: 'Rain Showers', icon: '🌦️' };
    case 85:
    case 86:
      return { description: 'Snow Showers', icon: '🌨️' };
    case 95:
      return { description: 'Thunderstorm', icon: '⛈️' };
    case 96:
    case 99:
      return { description: 'Thunderstorm with Hail', icon: '⛈️' };
    default:
      return { description: 'Partly Cloudy', icon: '⛅' };
  }
}

/**
 * Formats ISO date string into day name and formatted date.
 * @param {string} dateStr - YYYY-MM-DD date string
 * @param {number} index - Index in forecast array
 * @returns {{ dayName: string, formattedDate: string }}
 */
function formatForecastDate(dateStr, index) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dayName, formattedDate };
  } catch {
    return { dayName: `Day ${index + 1}`, formattedDate: dateStr };
  }
}

export default function App() {
  const [cityInput, setCityInput] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Fetches weather data for a given city using Open-Meteo APIs.
   * @param {string} city - The city name to search
   */
  async function fetchWeather(city) {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setErrorMessage('Please enter a city name to search.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Step 1: Geocoding - Convert city name to latitude and longitude
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedCity)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl);

      if (!geoResponse.ok) {
        throw new Error('Unable to connect to the location service. Please check your network connection.');
      }

      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`City "${trimmedCity}" was not found. Please verify the spelling and try again.`);
      }

      const location = geoData.results[0];
      const { latitude, longitude, name, country } = location;

      // Step 2: Forecast - Retrieve current weather and 5-day daily forecast
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=5`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error('Unable to fetch weather forecast data from the service. Please try again later.');
      }

      const forecastData = await forecastResponse.json();

      if (!forecastData.current || !forecastData.daily || !Array.isArray(forecastData.daily.time)) {
        throw new Error('Received an unexpected or incomplete weather response. Please try again.');
      }

      // Build daily forecast list (5 days)
      const dailyForecast = forecastData.daily.time.slice(0, 5).map((date, index) => {
        const weatherCode = forecastData.daily.weather_code[index];
        const condition = getWeatherDetails(weatherCode);
        const { dayName, formattedDate } = formatForecastDate(date, index);

        return {
          date,
          dayName,
          formattedDate,
          weatherCode,
          condition: condition.description,
          icon: condition.icon,
          maxTemp: Math.round(forecastData.daily.temperature_2m_max[index]),
          minTemp: Math.round(forecastData.daily.temperature_2m_min[index]),
        };
      });

      const currentWeatherCondition = getWeatherDetails(forecastData.current.weather_code);

      // Store organized weather data
      setWeatherData({
        cityName: name,
        country: country || '',
        current: {
          temperature: Math.round(forecastData.current.temperature_2m),
          feelsLike: Math.round(forecastData.current.apparent_temperature),
          humidity: forecastData.current.relative_humidity_2m,
          windSpeed: Math.round(forecastData.current.wind_speed_10m),
          condition: currentWeatherCondition.description,
          icon: currentWeatherCondition.icon,
          todayHigh: Math.round(forecastData.daily.temperature_2m_max[0]),
          todayLow: Math.round(forecastData.daily.temperature_2m_min[0]),
        },
        forecast: dailyForecast,
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Initial load: automatically fetch weather for "Peshawar"
  useEffect(() => {
    fetchWeather('Peshawar');
  }, []);

  /**
   * Handles search form submission.
   * @param {React.FormEvent} e
   */
  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchWeather(cityInput);
  }

  /**
   * Handles clicking on quick-suggestion city chips.
   * @param {string} cityName
   */
  function handleQuickCityClick(cityName) {
    setCityInput(cityName);
    fetchWeather(cityName);
  }

  return (
    <div className="app-container" id="weather-app">
      {/* 1. Header */}
      <header className="app-header" id="app-header">
        <div className="brand-wrapper">
          <span className="brand-icon" role="img" aria-label="weather icon">🌤️</span>
          <h1 className="app-title">WeatherNow</h1>
        </div>
        <p className="app-subtitle">Weather forecast at your fingertips</p>
      </header>

      {/* 2. Search Section */}
      <section className="search-section" id="search-section" aria-label="City Search">
        <form className="search-form" onSubmit={handleSearchSubmit} id="search-form">
          <div className="search-input-wrapper">
            <span className="search-icon-decor" aria-hidden="true">🔍</span>
            <input
              id="city-search-input"
              type="text"
              className="search-input"
              placeholder="Enter city name (e.g. Peshawar, London, Tokyo)..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              disabled={loading}
              aria-label="Enter city name"
              autoComplete="off"
            />
          </div>
          <button
            id="search-button"
            type="submit"
            className="search-button"
            disabled={loading}
            aria-label="Search weather"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Quick selection chips for convenient testing */}
        <div className="quick-cities" aria-label="Popular cities">
          <span className="quick-label">Popular:</span>
          {['Peshawar', 'London', 'Tokyo', 'New York', 'Dubai'].map((city) => (
            <button
              key={city}
              type="button"
              className="quick-chip"
              onClick={() => handleQuickCityClick(city)}
              disabled={loading}
            >
              {city}
            </button>
          ))}
        </div>
      </section>

      {/* 5. Error State */}
      {errorMessage && (
        <section className="error-card" id="error-card" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <h3 className="error-title">Search Notice</h3>
          <p className="error-message">{errorMessage}</p>
          <button
            type="button"
            className="error-retry-btn"
            onClick={() => fetchWeather(cityInput || 'Peshawar')}
          >
            Try Again
          </button>
        </section>
      )}

      {/* 6. Loading State */}
      {loading && (
        <section className="state-card" id="loading-card" aria-live="polite" aria-busy="true">
          <div className="loading-indicator">
            <div className="spinner" aria-hidden="true"></div>
            <p className="loading-text">Fetching current weather and 5-day forecast...</p>
          </div>
        </section>
      )}

      {/* Main Weather Display */}
      {!loading && weatherData && (
        <main className="weather-content" id="weather-content">
          {/* 3. Current Weather Card */}
          <article className="current-card" id="current-weather-card">
            <div className="current-card-header">
              <div className="location-block">
                <div className="location-title-row">
                  <h2 className="city-name">{weatherData.cityName}</h2>
                  {weatherData.country && (
                    <span className="country-name">{weatherData.country}</span>
                  )}
                </div>
                <span className="date-text">Updated today at {weatherData.lastUpdated}</span>
              </div>
              <div className="current-condition-badge">
                <span aria-hidden="true">{weatherData.current.icon}</span>
                <span>{weatherData.current.condition}</span>
              </div>
            </div>

            <div className="current-main-row">
              <div className="temp-group">
                <span className="current-weather-icon" role="img" aria-label={weatherData.current.condition}>
                  {weatherData.current.icon}
                </span>
                <div className="temp-wrapper">
                  <div className="temp-value-row">
                    <span className="current-temp-number">{weatherData.current.temperature}</span>
                    <span className="temp-unit">°C</span>
                  </div>
                  <span className="condition-text">{weatherData.current.condition}</span>
                </div>
              </div>

              <div className="temp-range-badge">
                <div className="range-item">
                  <span className="range-label">High</span>
                  <span className="range-value">{weatherData.current.todayHigh}°C</span>
                </div>
                <div className="range-separator" aria-hidden="true"></div>
                <div className="range-item">
                  <span className="range-label">Low</span>
                  <span className="range-value">{weatherData.current.todayLow}°C</span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-icon" aria-hidden="true">🌡️</span>
                <div className="metric-info">
                  <span className="metric-label">Feels Like</span>
                  <span className="metric-value">{weatherData.current.feelsLike}°C</span>
                </div>
              </div>

              <div className="metric-item">
                <span className="metric-icon" aria-hidden="true">💧</span>
                <div className="metric-info">
                  <span className="metric-label">Humidity</span>
                  <span className="metric-value">{weatherData.current.humidity}%</span>
                </div>
              </div>

              <div className="metric-item">
                <span className="metric-icon" aria-hidden="true">💨</span>
                <div className="metric-info">
                  <span className="metric-label">Wind Speed</span>
                  <span className="metric-value">{weatherData.current.windSpeed} km/h</span>
                </div>
              </div>

              <div className="metric-item">
                <span className="metric-icon" aria-hidden="true">📊</span>
                <div className="metric-info">
                  <span className="metric-label">Daily Range</span>
                  <span className="metric-value">
                    {weatherData.current.todayLow}° / {weatherData.current.todayHigh}°
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* 4. 5-Day Forecast Section */}
          <section className="forecast-section" id="forecast-section" aria-label="5-Day Forecast">
            <div className="section-header">
              <h3 className="section-title">5-Day Forecast</h3>
            </div>

            <div className="forecast-grid" id="forecast-grid">
              {weatherData.forecast.map((day, idx) => (
                <div
                  key={day.date}
                  className={`forecast-card ${idx === 0 ? 'today' : ''}`}
                  id={`forecast-card-${idx}`}
                >
                  <span className={`forecast-day ${idx === 0 ? 'highlight' : ''}`}>
                    {day.dayName}
                  </span>
                  <span className="forecast-date">{day.formattedDate}</span>
                  <span className="forecast-icon" role="img" aria-label={day.condition}>
                    {day.icon}
                  </span>
                  <span className="forecast-condition">{day.condition}</span>
                  <div className="forecast-temps">
                    <span className="forecast-max" title="Maximum Temperature">
                      {day.maxTemp}°C
                    </span>
                    <span className="forecast-min" title="Minimum Temperature">
                      {day.minTemp}°C
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="app-footer" id="app-footer">
        <p>
          Powered by{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo API
          </a>
          {' '}• Fast, free, and keyless weather forecasting
        </p>
      </footer>
    </div>
  );
}
