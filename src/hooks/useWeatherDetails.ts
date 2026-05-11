import { useReducer, useEffect, useCallback } from 'react';

export interface HourlyForecast {
  time: string;
  temp: number;
  icon: string;
  description: string;
}

export interface WeatherDetails {
  city: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  hourlyForecast: HourlyForecast[];
}

type State = {
  data: WeatherDetails | null;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: WeatherDetails }
  | { type: 'FETCH_ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { data: null, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { data: action.payload, loading: false, error: null };
    case 'FETCH_ERROR':
      return { data: null, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useWeatherDetails(cityName: string | null) {
  const [state, dispatch] = useReducer(reducer, {
    data: null,
    loading: false,
    error: null,
  });

  const fetchDetails = useCallback(async (city: string) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const API_KEY = 'CHAVE_API'; // ATENTAR PARA COLOCAR SUA CHAVE DE API AQUI
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=pt_br`
      );
      if (!res.ok) throw new Error('Cidade não encontrada');
      const json = await res.json();

      const details: WeatherDetails = {
        city: json.city.name,
        humidity: json.list[0].main.humidity,
        windSpeed: json.list[0].wind.speed,
        feelsLike: json.list[0].main.feels_like,
        hourlyForecast: json.list.slice(0, 8).map((item: any) => ({
          time: new Date(item.dt * 1000).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          description: item.weather[0].description,
        })),
      };

      dispatch({ type: 'FETCH_SUCCESS', payload: details });
    } catch (err: any) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  }, []);

  useEffect(() => {
    if (cityName) fetchDetails(cityName);
  }, [cityName, fetchDetails]);

  return { ...state };
}