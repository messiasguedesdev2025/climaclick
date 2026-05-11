// =============================================================
//  services/api.ts  –  Open-Meteo + Geocoding API integration
// =============================================================

// ─── Types ────────────────────────────────────────────────────

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string; // state / province
  timezone: string;
  population?: number;
}

export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
  is_day: number;
  precipitation: number;
  surface_pressure: number;
  visibility: number;
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  sunrise: string[];
  sunset: string[];
  wind_speed_10m_max: number[];
  uv_index_max: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyWeather;
  daily: DailyWeather;
}

export interface WeatherApiError {
  type: "not_found" | "api_error" | "network_error" | "no_results";
  message: string;
  details?: string;
}

// ─── Constants ────────────────────────────────────────────────

const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1";
const WEATHER_BASE   = "https://api.open-meteo.com/v1";

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
  "is_day",
  "precipitation",
  "surface_pressure",
  "visibility",
].join(",");

const HOURLY_FIELDS = [
  "temperature_2m",
  "precipitation_probability",
  "weather_code",
  "wind_speed_10m",
].join(",");

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "sunrise",
  "sunset",
  "wind_speed_10m_max",
  "uv_index_max",
].join(",");

// ─── Internal helpers ─────────────────────────────────────────

/**
 * Wraps fetch with a timeout and normalises errors into WeatherApiError.
 */
async function safeFetch(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw {
        type: "network_error",
        message: "A requisição excedeu o tempo limite. Verifique sua conexão.",
      } satisfies WeatherApiError;
    }
    throw {
      type: "network_error",
      message: "Não foi possível conectar à API. Verifique sua conexão com a internet.",
      details: err instanceof Error ? err.message : String(err),
    } satisfies WeatherApiError;
  }
}

// ─── Public API functions ──────────────────────────────────────

/**
 * Searches cities by name using the Open-Meteo Geocoding API.
 *
 * @param cityName  - The city name typed by the user.
 * @param language  - Language for result names (default: "pt" for Portuguese).
 * @param count     - Maximum number of results (default: 5).
 * @returns         Array of GeocodingResult or throws WeatherApiError.
 */
export async function searchCities(
  cityName: string,
  language = "pt",
  count = 5
): Promise<GeocodingResult[]> {
  const trimmed = cityName.trim();

  if (!trimmed) {
    throw {
      type: "not_found",
      message: "Digite o nome de uma cidade para buscar.",
    } satisfies WeatherApiError;
  }

  if (trimmed.length < 2) {
    throw {
      type: "not_found",
      message: "Digite pelo menos 2 caracteres para buscar.",
    } satisfies WeatherApiError;
  }

  const url = new URL(`${GEOCODING_BASE}/search`);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");

  const res = await safeFetch(url.toString());

  if (!res.ok) {
    throw {
      type: "api_error",
      message: "Erro ao buscar cidades. Tente novamente.",
      details: `HTTP ${res.status}: ${res.statusText}`,
    } satisfies WeatherApiError;
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw {
      type: "no_results",
      message: `Nenhuma cidade encontrada para "${trimmed}".`,
      details: "Verifique a grafia ou tente outra cidade.",
    } satisfies WeatherApiError;
  }

  return data.results as GeocodingResult[];
}

/**
 * Fetches full weather data (current + hourly + daily) for given coordinates.
 *
 * @param latitude   - Latitude of the location.
 * @param longitude  - Longitude of the location.
 * @param timezone   - IANA timezone string (e.g. "America/Fortaleza").
 * @returns          WeatherData or throws WeatherApiError.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone = "auto"
): Promise<WeatherData> {
  const url = new URL(`${WEATHER_BASE}/forecast`);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("current", CURRENT_FIELDS);
  url.searchParams.set("hourly", HOURLY_FIELDS);
  url.searchParams.set("hourly_past_days", "0");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("daily", DAILY_FIELDS);
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");

  const res = await safeFetch(url.toString());

  if (!res.ok) {
    throw {
      type: "api_error",
      message: "Erro ao buscar dados meteorológicos. Tente novamente.",
      details: `HTTP ${res.status}: ${res.statusText}`,
    } satisfies WeatherApiError;
  }

  const data = await res.json();

  // Open-Meteo returns a 200 with an "error" field on bad params
  if (data.error) {
    throw {
      type: "api_error",
      message: "Parâmetros inválidos enviados à API.",
      details: data.reason ?? "Erro desconhecido",
    } satisfies WeatherApiError;
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    current: data.current as CurrentWeather,
    hourly: data.hourly as HourlyWeather,
    daily: data.daily as DailyWeather,
  };
}

/**
 * Convenience: search for the first matching city and immediately
 * return its weather. Useful for quick "search + load" flows.
 */
export async function fetchWeatherByCity(cityName: string): Promise<{
  city: GeocodingResult;
  weather: WeatherData;
}> {
  const cities = await searchCities(cityName, "pt", 1);
  const city = cities[0];
  const weather = await fetchWeather(city.latitude, city.longitude, city.timezone);
  return { city, weather };
}

// ─── Weather code helpers ──────────────────────────────────────

/** Maps WMO weather interpretation codes to human-readable Portuguese labels. */
export function weatherCodeLabel(code: number): string {
  const map: Record<number, string> = {
    0: "Céu limpo", 1: "Predominantemente limpo", 2: "Parcialmente nublado",
    3: "Nublado", 45: "Névoa", 48: "Névoa com geada",
    51: "Chuvisco leve", 53: "Chuvisco moderado", 55: "Chuvisco intenso",
    61: "Chuva fraca", 63: "Chuva moderada", 65: "Chuva forte",
    71: "Neve fraca", 73: "Neve moderada", 75: "Neve forte",
    77: "Grãos de neve", 80: "Pancadas de chuva fracas",
    81: "Pancadas de chuva moderadas", 82: "Pancadas de chuva violentas",
    85: "Pancadas de neve fracas", 86: "Pancadas de neve fortes",
    95: "Tempestade", 96: "Tempestade com granizo leve",
    99: "Tempestade com granizo forte",
  };
  return map[code] ?? "Condição desconhecida";
}

/** Returns an emoji icon for a given WMO weather code. */
export function weatherCodeIcon(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "🌤️" : "🌙";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}