import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, SlidersHorizontal, Heart, ChevronDown, Check } from 'lucide-react';
import { Layout } from '../components/Layout';
import { TrailCard } from '../components/TrailCard';
import { ZONES, DIFFICULTIES, zoneKey, difficultyKey } from '../utils/trailFormat';
import { useAuth } from '../context/AuthContext';
import { useTrails, TrailsError } from '../context/TrailsContext';
import {
  DIFFICULTY_PARAM, DIFFICULTY_DOT, ZONE_PARAM, DURATIONS, readFilters, toSearchParams, matchesFilters, collectionBySlug,
} from '../utils/catalogFilters';

const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const toggle = (list, v) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

// Seletor (dropdown) de filtro. `multiple` permite marcar várias opções.
function FilterSelect({ label, placeholder, options, value, onChange, multiple }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = multiple ? value : value ? [value] : [];

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = id => {
    if (multiple) onChange(toggle(value, id));
    else { onChange(value === id ? null : id); setOpen(false); }
  };

  const summary = !selected.length
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.label
      : `${options.find(o => o.id === selected[0])?.label} +${selected.length - 1}`;

  return (
    <div className="relative" ref={ref}>
      <span className="block text-xs font-bold uppercase tracking-[0.18em] text-ink-muted mb-2">{label}</span>
      <button
        type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 text-left text-sm font-semibold transition ${open || selected.length ? 'border-brand ring-2 ring-brand/15' : 'border-border hover:border-brand/60'}`}
      >
        <span className={`truncate ${selected.length ? 'text-ink' : 'text-ink-muted'}`}>{summary}</span>
        <span className="flex items-center gap-2 shrink-0">
          {selected.length > 0 && <span className="rounded-full bg-brand text-brand-ink text-[11px] w-5 h-5 inline-flex items-center justify-center">{selected.length}</span>}
          <ChevronDown size={16} className={`text-ink-muted transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <ul role="listbox" aria-multiselectable={multiple || undefined} className="absolute z-30 left-0 right-0 mt-2 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl p-1.5 animate-rise" style={{ animationDuration: '.2s' }}>
          {options.map(o => {
            const on = selected.includes(o.id);
            return (
              <li key={o.id}>
                <button
                  type="button" role="option" aria-selected={on} onClick={() => pick(o.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-surface-2 ${on ? 'text-brand font-semibold' : 'text-ink'}`}
                >
                  <span className={`inline-flex w-[18px] h-[18px] items-center justify-center border transition ${multiple ? 'rounded-md' : 'rounded-full'} ${on ? 'border-brand bg-brand text-brand-ink' : 'border-border'}`}>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  {o.dot && <span className={`w-2 h-2 rounded-full ${o.dot}`} />}
                  <span className="flex-1 text-left">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Trails() {
  const { t } = useTranslation();
  const { likedTrails } = useAuth();
  const { trails, status } = useTrails();
  const [params, setParams] = useSearchParams();
  const onlyLiked = params.get('curtidas') === '1';
  // os filtros vivem na URL: dá para compartilhar o link e a Home abre o catálogo já filtrado
  const filters = useMemo(() => readFilters(params), [params]);
  // coleção vinda da Home: restringe a lista sem marcar nenhum filtro
  const collection = collectionBySlug(params.get('colecao'));

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // cada mudança reescreve a URL sem criar entrada no histórico
  const setFilter = key => value => {
    const next = toSearchParams({ ...filters, [key]: value });
    if (onlyLiked) next.set('curtidas', '1');
    if (collection) next.set('colecao', collection.slug);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return trails.filter(tr => {
      if (onlyLiked && !likedTrails.includes(tr.id)) return false;
      if (q && !normalize(`${tr.name} ${tr.location} ${tr.zone}`).includes(q)) return false;
      if (collection && !matchesFilters(tr, collection.filters)) return false;
      return matchesFilters(tr, filters);
    });
  }, [trails, query, filters, collection, onlyLiked, likedTrails]);

  const activeCount = filters.dificuldade.length + filters.zona.length + (filters.duracao ? 1 : 0) + (onlyLiked ? 1 : 0);
  const clear = () => { setQuery(''); setParams({}); };

  const anyLabel = t('all');

  return (
    <Layout>
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <header className="max-w-2xl">
            <p className="font-editorial text-sm font-semibold uppercase tracking-[0.3em] text-brand">{t('catalog_kicker')}</p>
            <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold text-ink tracking-tight leading-[1.02]">{t('catalog_title')}</h1>
            <p className="mt-3 text-lg text-ink-muted">{t('catalog_subtitle')}</p>
          </header>

          {/* Busca + filtros: no máximo metade da tela em desktop */}
          <div className="xl:max-w-[50vw]">
          {/* Busca */}
          <div className="mt-10 flex gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="input rounded-full pl-14 pr-12 py-4 text-base shadow-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-ink-muted hover:text-ink" aria-label="Limpar"><X size={18} /></button>
              )}
            </div>
            <button onClick={() => setShowFilters(s => !s)} className={`btn-ghost shrink-0 ${showFilters ? 'border-brand text-brand' : ''}`}>
              <SlidersHorizontal size={18} /><span className="hidden sm:inline">{t('filters')}</span>
              {activeCount > 0 && <span className="ml-1 rounded-full bg-brand text-brand-ink text-xs w-5 h-5 inline-flex items-center justify-center">{activeCount}</span>}
            </button>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="relative z-20 mt-5 rounded-2xl bg-surface border border-border p-5 md:p-6 grid sm:grid-cols-3 gap-4 md:gap-6 animate-rise" style={{ animationDuration: '.35s' }}>
              <FilterSelect
                multiple label={t('difficulty')} placeholder={anyLabel}
                options={DIFFICULTIES.map(d => ({ id: DIFFICULTY_PARAM[d], label: t(difficultyKey(d)), dot: DIFFICULTY_DOT[d] }))}
                value={filters.dificuldade} onChange={setFilter('dificuldade')}
              />
              <FilterSelect
                label={t('duration')} placeholder={anyLabel}
                options={DURATIONS.map(d => ({ id: d.id, label: t(d.label) }))}
                value={filters.duracao} onChange={setFilter('duracao')}
              />
              <FilterSelect
                multiple label={t('zone')} placeholder={anyLabel}
                options={ZONES.map(z => ({ id: ZONE_PARAM[z], label: t(zoneKey(z)) }))}
                value={filters.zona} onChange={setFilter('zona')}
              />
            </div>
          )}
          </div>

          <div className="mt-8 mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-muted flex items-center gap-2">
              {onlyLiked && <Heart size={16} className="fill-trail-hard text-trail-hard" />}
              {collection && <span className="text-ink">{t(`col_${collection.id}_title`)} ·</span>}
              {status === 'ready' ? t('results_count', { count: filtered.length }) : t('trails_loading')}
            </p>
            {(activeCount > 0 || collection) && <button onClick={clear} className="text-sm font-semibold text-brand hover:underline">{t('clear_filters')}</button>}
          </div>

          {status === 'error' ? (
            <TrailsError />
          ) : status === 'loading' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-hidden="true">
              {[0, 1, 2, 3].map(i => <div key={i} className="map-skeleton h-80 rounded-xl" />)}
            </div>
          ) : filtered.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(tr => <TrailCard key={tr.id} trail={tr} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border py-20 text-center">
              <p className="text-ink-muted">{t('no_results')}</p>
              <button onClick={clear} className="btn-ghost mt-5">{t('clear_filters')}</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
