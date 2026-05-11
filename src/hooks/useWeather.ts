// =============================================================
//  src/hooks/useWeather.ts  –  Custom hooks de dados climáticos
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  searchCities,
  fetchWeather,
  type GeocodingResult,
  type WeatherData,
  type WeatherApiError,
} from "../services/api";

// ─── useWeather ────────────────────────────────────────────────
// Carrega e gerencia os dados climáticos de uma cidade selecionada.

interface UseWeatherReturn {
  weather: WeatherData | null;
  city: GeocodingResult | null;
  isLoading: boolean;
  error: WeatherApiError | null;
  loadWeather: (city: GeocodingResult) => Promise<void>;
  clearError: () => void;
}

export function useWeather(defaultCity?: GeocodingResult): UseWeatherReturn {
  const [weather, setWeather]   = useState<WeatherData | null>(null);
  const [city, setCity]         = useState<GeocodingResult | null>(defaultCity ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<WeatherApiError | null>(null);

  const loadWeather = useCallback(async (selectedCity: GeocodingResult) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(
        selectedCity.latitude,
        selectedCity.longitude,
        selectedCity.timezone
      );
      setWeather(data);
      setCity(selectedCity);
    } catch (err) {
      setError(err as WeatherApiError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega dados iniciais se uma cidade padrão for fornecida
  useEffect(() => {
    if (defaultCity) {
      loadWeather(defaultCity);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = useCallback(() => setError(null), []);

  return { weather, city, isLoading, error, loadWeather, clearError };
}

// ─── useCitySearch ─────────────────────────────────────────────
// Gerencia a busca de cidades com debounce automático.

interface UseCitySearchReturn {
  query: string;
  setQuery: (q: string) => void;
  suggestions: GeocodingResult[];
  isSearching: boolean;
  error: WeatherApiError | null;
  clearSuggestions: () => void;
  clearError: () => void;
}

export function useCitySearch(debounceMs = 400): UseCitySearchReturn {
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError]             = useState<WeatherApiError | null>(null);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const results = await searchCities(query);
        setSuggestions(results);
      } catch (err) {
        setError(err as WeatherApiError);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);
  const clearError       = useCallback(() => setError(null), []);

  return { query, setQuery, suggestions, isSearching, error, clearSuggestions, clearError };
}