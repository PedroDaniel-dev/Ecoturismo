import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, History, Search, ShieldAlert } from 'lucide-react';
import { Layout } from '../components/Layout';
import { avatarOf } from '../components/party/PartyCards';
import { useAuth } from '../context/AuthContext';
import { useTrails } from '../context/TrailsContext';
import { api } from '../utils/api';
import { ZONES, zoneKey } from '../utils/trailFormat';

// '' = todos; o filtro vai na URL (?status=) e o padrão são os ativos
const FILTERS = ['ATIVO', 'EM_VERIFICACAO', 'RESOLVIDO', ''];

export const DANGER_STATUS_STYLE = {
  ATIVO: 'bg-trail-hard/15 text-trail-hard ring-trail-hard/30',
  EM_VERIFICACAO: 'bg-trail-moderate/15 text-trail-moderate ring-trail-moderate/30',
  RESOLVIDO: 'bg-trail-easy/15 text-trail-easy ring-trail-easy/30',
};

// "há 2 dias", "ontem"… no idioma atual
function timeAgo(iso, lang) {
  const diff = (new Date(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const steps = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [2592000, 'day'], [31536000, 'month']];
  for (const [limit, unit] of steps) {
    if (Math.abs(diff) < limit) {
      const size = { second: 1, minute: 60, hour: 3600, day: 86400, month: 2592000 }[unit];
      return rtf.format(Math.round(diff / size), unit);
    }
  }
  return rtf.format(Math.round(diff / 31536000), 'year');
}

export function Dangers() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { trailById } = useTrails();
  const [params, setParams] = useSearchParams();
  const param = params.get('status');
  const status = param === 'todos' ? '' : FILTERS.includes(param) ? param : 'ATIVO';
  const [list, setList] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('');

  useEffect(() => {
    let alive = true;
    setList(null); setError(false);
    api(`/avisos/perigos${status ? `?status=${status}` : ''}`)
      .then(r => alive && setList(r))
      .catch(() => { if (alive) { setList([]); setError(true); } });
    return () => { alive = false; };
  }, [status]);

  // busca e zona filtram no navegador; o nome vem do catálogo ou, se a trilha não estiver nele, do texto do aviso
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list || []).filter(a => {
      const trail = a.trilhaId && trailById(a.trilhaId);
      if (zone && trail?.zone !== zone) return false;
      return !q || (trail?.name || a.trilha).toLowerCase().includes(q);
    });
  }, [list, query, zone, trailById]);

  const changed = updated => setList(l => l.map(a => (a.id === updated.id ? updated : a)));

  return (
    <Layout>
      <div className="pt-32 pb-20">
        <div className="container mx-auto max-w-3xl px-4">
          <header>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">{t('dangers_kicker')}</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{t('dangers_title')}</h1>
            <p className="mt-3 text-lg text-ink-muted">{t('dangers_subtitle')}</p>
          </header>

          {/* o aviso nasce de uma visita (trilha e visita já escolhidas), então o caminho é pelo histórico */}
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-trail-hard/25 bg-trail-hard/5 p-5 sm:flex-row sm:items-center">
            <ShieldAlert size={28} className="shrink-0 text-trail-hard" />
            <p className="flex-1 text-sm leading-relaxed text-ink">{t('dangers_how')}</p>
            <Link
              to={isLoggedIn ? '/perfil?aba=visitas' : '/login'} state={isLoggedIn ? undefined : { from: '/perfil?aba=visitas' }}
              className="btn-primary shrink-0 px-5 py-2.5 text-sm"
            >
              <History size={16} />{t('dangers_my_visits')}
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('danger_status_label')}>
              {FILTERS.map(f => (
                <button
                  key={f || 'all'} role="radio" aria-checked={status === f}
                  onClick={() => setParams(f === 'ATIVO' ? {} : { status: f || 'todos' }, { replace: true })}
                  className={`chip ${status === f ? 'chip-active' : ''}`}
                >
                  {f ? t(`danger_status_${f}`) : t('dangers_all')}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('dangers_search')} className="input pl-10" aria-label={t('dangers_search')} />
              </label>
              <select value={zone} onChange={e => setZone(e.target.value)} className="input sm:w-48" aria-label={t('zone')}>
                <option value="">{t('zone')}: {t('all')}</option>
                {ZONES.map(z => <option key={z} value={z}>{t(zoneKey(z))}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {list === null ? (
              [0, 1, 2].map(i => <div key={i} className="map-skeleton h-44 rounded-2xl" aria-hidden="true" />)
            ) : shown.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center">
                <p className="text-ink-muted">{t(error ? 'dangers_error' : 'dangers_empty')}</p>
              </div>
            ) : (
              shown.map(a => <DangerCard key={a.id} aviso={a} trail={a.trilhaId ? trailById(a.trilhaId) : null} onChanged={changed} />)
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function DangerCard({ aviso, trail, onChanged }) {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const long = aviso.mensagem.length > 220;
  const resolved = aviso.status === 'RESOLVIDO';
  const when = new Date(aviso.criadoEm);

  const setStatus = async status => {
    setBusy(true);
    try { onChanged(await api(`/avisos/${aviso.id}/status?status=${status}`, { method: 'PATCH', token })); } catch (e) { /* fica como estava */ }
    setBusy(false);
  };

  return (
    <article className={`rounded-2xl border border-border bg-surface p-5 shadow-sm transition ${resolved ? 'opacity-75' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <select
            value={aviso.status} onChange={e => setStatus(e.target.value)} disabled={busy} aria-label={t('danger_status_label')}
            className={`rounded-full border-0 px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${DANGER_STATUS_STYLE[aviso.status]}`}
          >
            {Object.keys(DANGER_STATUS_STYLE).map(s => <option key={s} value={s}>{t(`danger_status_${s}`)}</option>)}
          </select>
        ) : (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${DANGER_STATUS_STYLE[aviso.status]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{t(`danger_status_${aviso.status}`)}
          </span>
        )}
        <time dateTime={aviso.criadoEm} className="text-xs text-ink-muted" title={when.toLocaleString(i18n.language)}>
          {timeAgo(aviso.criadoEm, i18n.language)} · {when.toLocaleString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {trail && <img src={trail.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0">
          <h2 className="truncate font-bold text-ink">{trail?.name || aviso.trilha}</h2>
          {trail && <p className="text-sm text-ink-muted">{t(zoneKey(trail.zone))}{trail.park ? ` · ${trail.park}` : ''}</p>}
        </div>
      </div>

      <p className={`mt-4 whitespace-pre-line leading-relaxed text-ink ${long && !open ? 'line-clamp-3' : ''}`}>{aviso.mensagem}</p>
      {long && (
        <button onClick={() => setOpen(o => !o)} className="mt-1 text-sm font-semibold text-brand hover:underline">
          {t(open ? 'see_less' : 'see_more')}
        </button>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        {aviso.autor ? (
          <Link to={`/usuarios/${aviso.autor.id}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink hover:text-brand">
            <img src={avatarOf(aviso.autor)} alt="" className="h-7 w-7 rounded-full object-cover" />
            <span className="truncate">{aviso.autor.nome}</span>
          </Link>
        ) : <span />}
        {trail && (
          <Link to={`/trilhas/${trail.id}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {t('see_trail')}<ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
