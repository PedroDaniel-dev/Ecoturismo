import { useEffect, useState } from 'react';

// Alvorada e vento de hoje no Rio, via Open-Meteo (gratuita, sem chave). Guardado na sessão para não refazer a chamada.
const URL_RIO = 'https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729'
  + '&current=wind_speed_10m,wind_direction_10m&daily=sunrise&timezone=America%2FSao_Paulo&forecast_days=1';
const KEY = 'rio-weather';
const COMPASS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];

export function useRioWeather() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; }
  });

  useEffect(() => {
    if (data) return;
    const ctrl = new AbortController();
    fetch(URL_RIO, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => {
        const w = {
          sunrise: j.daily?.sunrise?.[0]?.slice(11, 16),
          wind: Math.round(j.current?.wind_speed_10m),
          dir: COMPASS[Math.round((j.current?.wind_direction_10m ?? 0) / 45) % 8],
        };
        setData(w);
        try { sessionStorage.setItem(KEY, JSON.stringify(w)); } catch (e) { /* ignore */ }
      })
      .catch(() => { /* sem dados: a barra mostra só a localização */ });
    return () => ctrl.abort();
  }, [data]);

  return data;
}
