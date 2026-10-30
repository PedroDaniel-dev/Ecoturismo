import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { fromApi } from '../utils/trailFormat';

// Catálogo carregado uma vez do backend e compartilhado por todas as telas.
const TrailsContext = createContext(null);

// O frontend sobe em menos de 1 s e o backend leva uns 10–20 s (npm run dev na raiz sobe os dois juntos).
// Enquanto isso, continua tentando em silêncio antes de mostrar o erro.
const RETRY_EVERY_MS = 2000;
const RETRY_FOR_MS = 60000;

export function TrailsProvider({ children }) {
  const [state, setState] = useState({ trails: [], status: 'loading' }); // loading | ready | error
  const timer = useRef(null);

  const load = useCallback(() => {
    clearTimeout(timer.current);
    setState(s => ({ ...s, status: 'loading' }));
    const start = Date.now();
    const attempt = () => api('/trilhas')
      .then(list => setState({ trails: list.map(fromApi), status: 'ready' }))
      .catch(() => {
        if (Date.now() - start < RETRY_FOR_MS) timer.current = setTimeout(attempt, RETRY_EVERY_MS);
        else setState({ trails: [], status: 'error' });
      });
    attempt();
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, [load]);

  const value = useMemo(() => {
    const byId = new Map(state.trails.map(t => [t.id, t]));
    return { ...state, reload: load, trailById: id => byId.get(Number(id)) };
  }, [state, load]);

  return <TrailsContext.Provider value={value}>{children}</TrailsContext.Provider>;
}

export const useTrails = () => useContext(TrailsContext);

// Aviso padrão quando o catálogo não carrega (backend desligado ou fora do ar)
export function TrailsError({ className = '' }) {
  const { t } = useTranslation();
  const { reload } = useTrails();
  return (
    <div className={`rounded-3xl border border-dashed border-border px-6 py-16 text-center ${className}`}>
      <p className="text-ink-muted">{t('trails_error')}</p>
      <button onClick={reload} className="btn-ghost mt-5">{t('retry')}</button>
    </div>
  );
}
