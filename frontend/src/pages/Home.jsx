import React, { useState, useEffect } from "react";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import api from "../axios";
import "../styles/Home.css";

// Import your weather background images
import clear from "../assets/sunny.jpg";
import rain from "../assets/rainy.avif";
import clouds from "../assets/cloudy.jpg";
import snow from "../assets/snow.jpg";
import thunderstorm from "../assets/thunderstorm.jpg";
import defaultBg from "../assets/sunny.jpg";
import clear_night from "../assets/clear_night.webp";
import rain_night from "../assets/rainy_night.jpg";
import clouds_night from "../assets/cloudy_night.jpg";
import snow_night from "../assets/snowy_night.jpg";
import thunder_night from "../assets/thunder_night.webp";

countries.registerLocale(enLocale);

const getCountryName = (code) => {
  return countries.getName(code, "en", { select: "official" }) || code;
};

const getLocalTime = (timezone) => {
  const nowUTC = new Date().getTime();
  const offset = new Date().getTimezoneOffset() * 60 * 1000;
  const utc = nowUTC + offset;
  const localTime = new Date(utc + timezone * 1000);
  return localTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

const getLocalHour = (dt, timezone) => {
  const utc = dt * 1000;
  const localTime = new Date(utc + timezone * 1000);
  return localTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

const getBanner = (weatherMain, current) => {
  if (!weatherMain || !current) return defaultBg;
  const { dt, sys } = current;
  const isDay = dt >= sys.sunrise && dt < sys.sunset;
  switch (weatherMain) {
    case "Clear": return isDay ? clear : clear_night;
    case "Rain":
    case "Drizzle": return isDay ? rain : rain_night;
    case "Thunderstorm": return isDay ? thunderstorm : thunder_night;
    case "Clouds": return isDay ? clouds : clouds_night;
    case "Snow": return isDay ? snow : snow_night;
    default: return defaultBg;
  }
};

const Home = () => {
  const [city, setCity] = useState("New Delhi");
  const [current, setCurrent] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getAdvice = (currentWeather) => {
    if (!currentWeather || !currentWeather.weather || !currentWeather.main) return "";
    const { main, weather } = currentWeather;
    const condition = weather[0].main;
    const temp = main.temp;
    if (["Rain", "Drizzle", "Thunderstorm"].includes(condition)) return "Carry an umbrella 🌧️";
    if (condition === "Snow") return "Wear warm clothes ❄️";
    if (condition === "Clear" && temp > 30) return "Stay hydrated ☀️";
    if (condition === "Clouds") return "Enjoy a calm day ☁️";
    if (temp < 10) return "Wear a jacket 🧥";
    return "Have a nice day! 😊";
  };

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`geocoding/?q=${query}`);
      setSuggestions(res.data);
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    fetchSuggestions(city);
  }, [city]);

  useEffect(() => {
    getWeather("New Delhi");
  }, []);

  const selectCity = (item) => {
    setCity(item.name);
    setSuggestions([]);
    getWeather(item.name, item.lat, item.lon);
  };

  const getWeather = async (selectedCity, lat, lon) => {
    setIsLoading(true);
    const cityToSearch = selectedCity || city;
    setError("");
    setSuggestions([]);

    if (selectedCity) {
      setCity(selectedCity);
    }

    try {
      const currentRes = await api.get(
        lat && lon
          ? `weather/?lat=${lat}&lon=${lon}`
          : `weather/?city=${cityToSearch}`
      );
      setCurrent(currentRes.data);
    } catch {
      setError("No location found.");
      setIsLoading(false);
      return;
    }

    try {
      const forecastRes = await api.get(
        lat && lon
          ? `forecast/?lat=${lat}&lon=${lon}`
          : `forecast/?city=${cityToSearch}`
      );
      setForecast(Array.isArray(forecastRes.data.list) ? forecastRes.data.list : []);
    } catch {
      setForecast([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hourlyForecast = Array.isArray(forecast) ? forecast.filter(item => {
  const currentUTC = Math.floor(Date.now() / 1000);
  return item.dt > currentUTC;
}).slice(0, 6) : [];


  const getDailyForecast = (forecastList, timezone) => {
    if (!Array.isArray(forecastList)) return [];
    const daily = [];
    const seenDays = new Set();
    
    // Get current time in the city's timezone
    const nowUTC = Date.now();
    const currentLocal = new Date(nowUTC + timezone * 1000);
    const currentDayStart = new Date(currentLocal);
    currentDayStart.setHours(0, 0, 0, 0); // Start of current day in city's timezone

    for (let item of forecastList) {
      if (!item.dt) continue; // Skip invalid data
      const itemLocal = new Date(item.dt * 1000 + timezone * 1000);
      if (isNaN(itemLocal.getTime())) continue; // Skip invalid dates
      const itemDayStart = new Date(itemLocal);
      itemDayStart.setHours(0, 0, 0, 0); // Start of forecast item's day
      
      // Skip if it's the same day as today
      if (itemDayStart.getTime() === currentDayStart.getTime()) continue;
      
      const key = itemDayStart.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!seenDays.has(key)) {
        daily.push(item);
        seenDays.add(key);
      }
      
      // Stop after collecting 5 days
      if (daily.length >= 5) break;
    }
    return daily;
  };

  const dailyForecast = current ? getDailyForecast(forecast, current.timezone) : [];

  const getDayName = (timestamp, timezone) => {
    const date = new Date(timestamp * 1000 + timezone * 1000);
    const today = new Date(Date.now() + timezone * 1000);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    
    return date.toLocaleDateString("en-IN", { weekday: "long" });
  };

  return (
    <div className="weather-app">
      <header>
        <h1>Weather Dashboard</h1>
        <div className="search-bar">
  <div className="input-wrapper">
    <input
      type="text"
      value={city}
      onChange={(e) => setCity(e.target.value)}
      placeholder="Enter city"
      onFocus={() => { setError(""); setIsInputFocused(true); }}
      onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
      disabled={isLoading}
    />

    {isInputFocused && suggestions.length > 0 && (
      <ul className="suggestion-list">
        {suggestions.map((item, idx) => (
          <li key={idx} onClick={() => selectCity(item)}>
            {item.name}, {item.country}
          </li>
        ))}
      </ul>
    )}
  </div>

  <button onClick={() => getWeather()} disabled={isLoading}>
    {isLoading ? "Loading..." : "Search"}
  </button>
</div>

      </header>

      {isLoading && <div className="loading-spinner">Loading weather data...</div>}

      {current && current.weather && current.weather[0] && (
        <div
          className="banner"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${getBanner(current.weather[0].main, current)})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="overlay">
            <h2>{current.name}, {getCountryName(current.sys.country)}</h2>
            <p className="time">Local Time: {getLocalTime(current.timezone)}</p>
            <p className="temp">{Math.round(current.main.temp)}°C</p>
            <p className="desc">{current.weather[0].description}</p>
            <p className="advice">{getAdvice(current)}</p>
            <div className="details">
              <p>Feels Like: {Math.round(current.main.feels_like)}°C</p>
              <p>Humidity: {current.main.humidity}%</p>
              <p>Wind: {current.wind.speed} m/s</p>
              <p>Pressure: {current.main.pressure} hPa</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      {!error && dailyForecast.length === 0 && forecast.length > 0 && (
        <p className="info-message">Loading forecast data...</p>
      )}

      {hourlyForecast.length > 0 && (
        <div className="hourly-forecast">
          <h3>Next Hours</h3>
          <div className="forecast-grid">
            {hourlyForecast.map((hour, idx) => (
              <div
                className="forecast-card"
                key={idx}
                onClick={() => setSelectedForecast({ ...hour, type: 'hourly' })}
              >
                <p>{getLocalHour(hour.dt, current.timezone)}</p>
                <img 
                  src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png`} 
                  alt={hour.weather[0].description}
                  onError={(e) => {
                    e.target.src = `https://openweathermap.org/img/wn/01d@2x.png`;
                  }}
                />
                <p>{Math.round(hour.main.temp)}°C</p>
                <p>{hour.weather[0].description}</p>
                {hour.pop !== undefined && <p>Rain: {Math.round(hour.pop * 100)}%</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyForecast.length > 0 && (
        <div className="forecast-section">
          <h3>4-Day Forecast</h3>
          <div className="forecast-grid">
            {dailyForecast.map((day, index) => (
              <div
                className="forecast-card"
                key={index}
                onClick={() => setSelectedForecast({ ...day, type: 'daily' })}
              >
                <p>{getDayName(day.dt, current.timezone)}</p>
                <img 
                  src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`} 
                  alt={day.weather[0].description}
                  onError={(e) => {
                    e.target.src = `https://openweathermap.org/img/wn/01d@2x.png`;
                  }}
                />
                <p>{Math.round(day.main.temp_min)}°C / {Math.round(day.main.temp_max)}°C</p>
                <p>{day.weather[0].description}</p>
                {day.pop !== undefined && <p>Rain: {Math.round(day.pop * 100)}%</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="map-section">
        <h3>Global Weather Map</h3>
        <div className="iframe-wrapper">
          <iframe
            src="https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=20&lon=78&zoom=3"
            width="100%"
            height="500"
            style={{ border: 0 }}
            title="Weather Map"
            loading="lazy"
          ></iframe>
        </div>
      </div>

      {selectedForecast && (
        <div className="forecast-detail-modal">
          <div className="modal-content">
            <h3>Detailed {selectedForecast.type === 'hourly' ? 'Hourly' : 'Daily'} Forecast</h3>
            <p>Temperature: {Math.round(selectedForecast.main.temp)}°C</p>
            <p>Feels Like: {Math.round(selectedForecast.main.feels_like)}°C</p>
            <p>Humidity: {selectedForecast.main.humidity}%</p>
            <p>Wind: {selectedForecast.wind?.speed || current?.wind?.speed || 0} m/s</p>
            <p>Pressure: {selectedForecast.main.pressure} hPa</p>
            <p>Weather: {selectedForecast.weather[0].description}</p>
            <button onClick={() => setSelectedForecast(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;