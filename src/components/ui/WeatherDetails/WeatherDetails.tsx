import { useWeatherDetails } from '../../../hooks/useWeatherDetails';
import { SkeletonCard } from '../SkeletonCard';
import { Spinner } from '../Spinner';

interface Props {
  city: string | null;
  onBack: () => void;
}

export function WeatherDetails({ city, onBack }: Props) {
  const { data, loading, error } = useWeatherDetails(city);

  if (!city) return null;

  return (
    <div className="weather-details">

      <button onClick={onBack}>← Voltar</button>

      {loading && (
        <div>
          <Spinner />
          <SkeletonCard />
        </div>
      )}

      {error && (
        <p style={{ color: 'red' }}>Erro: {error}</p>
      )}

      {data && (
        <div>
          <h2>{data.city}</h2>

          <div className="details-grid">
            <div className="detail-card">
              <p>Umidade</p>
              <strong>{data.humidity}%</strong>
            </div>
            <div className="detail-card">
              <p>Vento</p>
              <strong>{data.windSpeed} km/h</strong>
            </div>
            <div className="detail-card">
              <p>Sensação térmica</p>
              <strong>{data.feelsLike}°C</strong>
            </div>
          </div>

          <h3>Previsão por hora</h3>
          <div className="hourly-forecast">
            {data.hourlyForecast.map((h, i) => (
              <div key={i} className="hourly-item">
                <p>{h.time}</p>
                <img
                  src={`https://openweathermap.org/img/wn/${h.icon}.png`}
                  alt={h.description}
                />
                <strong>{h.temp}°C</strong>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}