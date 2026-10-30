import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, Lightbulb, AlertTriangle, ShieldAlert, CheckCircle2, Send, ChevronUp, Sparkles } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Hero } from '../components/Hero';
import { TrailCard } from '../components/TrailCard';
import { ZONES, difficultyKey } from '../utils/trailFormat';
import { useTrails, TrailsError } from '../context/TrailsContext';
import { useAuth } from '../context/AuthContext';
import { COLLECTIONS, DIFFICULTY_DOT, matchesFilters } from '../utils/catalogFilters';
import { LANGUAGES } from '../i18n';
import { api } from '../utils/api';

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-editorial text-xs font-semibold uppercase tracking-[0.25em] ${className}`}>
      {children}
    </span>
  );
}

const sectionTitle = 'font-display font-normal text-4xl sm:text-5xl md:text-6xl text-ink leading-tight tracking-tight';

/* ════════ POR ONDE COMEÇAR — seletor de coleções + vitrine das trilhas da coleção escolhida ════════ */
const SHOWCASE_MAX = 4; // o resto fica para o catálogo

function StartHere() {
  const { t } = useTranslation();
  const { trails, status } = useTrails();
  const free = trails.filter(tr => tr.fee === 0).length;
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const COLLECTION_TRAILS = useMemo(() => COLLECTIONS.map(c => ({ ...c, list: trails.filter(tr => matchesFilters(tr, c.filters)) })), [trails]);
  const current = COLLECTION_TRAILS[active];

  // setas para cima/baixo trocam de coleção, como num tablist vertical
  const onKey = e => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (active + step + COLLECTION_TRAILS.length) % COLLECTION_TRAILS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="comecar" className="bg-base py-20 sm:py-28 scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Badge className="bg-brand/10 text-brand mb-4">{t('start_kicker')}</Badge>
            <h2 className={sectionTitle}>{t('start_title')}</h2>
          </div>
          {status === 'ready' && <p className="max-w-md text-base text-ink-muted leading-relaxed">{t('start_text', { free, total: trails.length })}</p>}
        </div>

        {status === 'error' ? <TrailsError /> : status === 'loading' ? (
          <div className="map-skeleton h-80 rounded-2xl" aria-hidden="true" />
        ) : (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-8 lg:gap-12">
          {/* seletor */}
          <div role="tablist" aria-orientation="vertical" aria-label={t('start_kicker')} onKeyDown={onKey} className="flex flex-col gap-1">
            {COLLECTION_TRAILS.map((c, i) => {
              const on = i === active;
              return (
                <Fragment key={c.id}>
                  <button
                    ref={el => { tabRefs.current[i] = el; }}
                    role="tab" id={`col-tab-${c.id}`} aria-selected={on} aria-controls="col-panel col-panel-mobile" tabIndex={on ? 0 : -1}
                    onClick={() => setActive(i)}
                    className={`group rounded-xl px-5 py-4 text-left transition ${on ? 'bg-surface shadow-sm ring-1 ring-border' : 'hover:bg-surface/60'}`}
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className={`text-lg font-bold transition-colors ${on ? 'text-brand' : 'text-ink group-hover:text-brand'}`}>{t(`col_${c.id}_title`)}</span>
                      <span className={`font-display text-3xl leading-none tabular-nums ${on ? 'text-brand' : 'text-ink-muted'}`}>{c.list.length}</span>
                    </span>
                    <span className={`block text-sm text-ink-muted transition-all ${on ? 'mt-1 max-h-12 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      {t(`col_${c.id}_text`)}
                    </span>
                  </button>
                  {/* no celular a vitrine abre logo abaixo da coleção escolhida */}
                  {on && (
                    <div role="tabpanel" id="col-panel-mobile" aria-labelledby={`col-tab-${c.id}`} className="lg:hidden px-1 pt-5 pb-8">
                      <Showcase collection={c} />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* no desktop a vitrine fica na coluna da direita */}
          <div role="tabpanel" id="col-panel" aria-labelledby={`col-tab-${current.id}`} className="hidden lg:block">
            <Showcase collection={current} />
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

// Vitrine: miniaturas horizontais, para não repetir os cards de Destaques logo abaixo
function Showcase({ collection: c }) {
  const { t } = useTranslation();
  const shown = c.list.slice(0, SHOWCASE_MAX);
  return (
    <div className="flex flex-col">
      <ul key={c.id} className="grid sm:grid-cols-2 gap-4 animate-rise" style={{ animationDuration: '.35s' }}>
        {shown.map(tr => (
          <li key={tr.id}>
            <Link to={`/trilhas/${tr.id}`} viewTransition className="group flex items-center gap-4 rounded-xl p-2 -m-2 hover:bg-surface transition">
              <img
                src={tr.images[0]} alt="" loading="lazy" decoding="async"
                onError={e => { if (e.currentTarget.src !== tr.fallbacks[0]) e.currentTarget.src = tr.fallbacks[0]; }}
                className="w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-lg object-cover bg-surface-2"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-ink leading-snug group-hover:text-brand transition-colors">{tr.name}</span>
                <span className="mt-0.5 block truncate text-sm text-ink-muted">{tr.location}</span>
                <span className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <Clock size={13} className="text-brand" />{tr.time}
                  <span className={`ml-1 w-2 h-2 rounded-full ${DIFFICULTY_DOT[tr.difficulty]}`} />{t(difficultyKey(tr.difficulty))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5">
        <Link to={`/trilhas?colecao=${c.slug}`} viewTransition className="group inline-flex items-center gap-2 text-sm font-semibold text-brand">
          {t('start_see', { count: c.list.length })}
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        {c.list.length > SHOWCASE_MAX && (
          <span className="text-sm text-ink-muted">{t('start_more', { count: c.list.length - SHOWCASE_MAX })}</span>
        )}
      </div>
    </div>
  );
}

/* ════════ SELEÇÃO — 4 trilhas com o mesmo card e a mesma grade do catálogo ════════ */
function Featured() {
  const { t } = useTranslation();
  const { trails, status } = useTrails();
  const selection = trails.filter(tr => tr.featured).slice(0, 4);
  if (status === 'error') return null; // o aviso de erro já aparece em "Por onde começar"

  return (
    <section className="bg-surface py-20 sm:py-28 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <Badge className="bg-gold/10 text-brand mb-4"><Sparkles size={14} />{t('featured_kicker')}</Badge>
            <h2 className={sectionTitle}>{t('featured_title')}</h2>
          </div>
          <p className="max-w-md text-base text-ink-muted leading-relaxed">{t('featured_text')}</p>
        </div>

        {/* no lg (3 colunas) o 4º card some para não sobrar sozinho numa linha */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {status === 'loading'
            ? [0, 1, 2, 3].map(i => <div key={i} className={`map-skeleton h-80 rounded-xl ${i === 3 ? 'lg:max-xl:hidden' : ''}`} aria-hidden="true" />)
            : selection.map((tr, i) => <TrailCard key={tr.id} trail={tr} className={i === 3 ? 'lg:max-xl:hidden' : ''} />)}
        </div>

        <div className="text-center">
          <Link
            to="/trilhas" viewTransition
            className="group inline-flex items-center gap-3 rounded-full bg-brand px-8 py-4 text-sm font-semibold uppercase tracking-wide text-brand-ink shadow-lg shadow-brand/25 hover:shadow-xl hover:brightness-110 transition-all duration-300"
          >
            {t('see_catalog')}
            <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════ NÚMEROS — grandes, sem caixas (contados a partir dos dados) ════════ */
function Stats() {
  const { t } = useTranslation();
  const { trails, status } = useTrails();
  const ready = status === 'ready';
  const stats = [
    { value: ready ? trails.length : '—', key: 'stat_trails' },
    { value: ready ? trails.filter(tr => tr.fee === 0).length : '—', key: 'stat_free' },
    { value: ZONES.length, key: 'stat_zones' },
    { value: LANGUAGES.length, key: 'stat_langs' },
  ];
  return (
    <section className="bg-base py-16 sm:py-20 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, key }) => (
            <div key={key}>
              <span className="block mb-2 font-display font-normal text-4xl sm:text-5xl leading-none text-ink">{value}</span>
              <span className="text-sm uppercase tracking-wider text-ink-muted">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════ CONTRIBUIR — campos só com linha ════════ */
const lineInput = 'w-full border-b border-border bg-transparent py-2 text-ink placeholder:text-ink-muted outline-none transition focus:border-brand';

function Contribute() {
  const { t } = useTranslation();
  const { isLoggedIn, token } = useAuth();
  const [tipo, setTipo] = useState('SUGESTAO');
  const [form, setForm] = useState({ trilha: '', mensagem: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const types = [
    { id: 'SUGESTAO', icon: Lightbulb, label: t('type_suggest') },
    { id: 'PROBLEMA', icon: AlertTriangle, label: t('type_problem') },
    { id: 'PERIGO', icon: ShieldAlert, label: t('type_danger') },
  ];

  // quem envia vem do login (o backend recusa contribuições anônimas)
  const submit = async e => {
    e.preventDefault();
    setError('');
    try {
      await api('/avisos', { method: 'POST', token, body: { tipo, ...form } });
      setSent(true);
      setForm({ trilha: '', mensagem: '' });
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setError(t('contrib_error'));
    }
  };

  return (
    <section className="bg-surface py-16 sm:py-20 border-t border-border">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="mb-4 font-display font-normal text-3xl sm:text-4xl text-ink leading-tight">{t('contrib_title')}</h2>
            <p className="text-ink-muted leading-relaxed">{t('contrib_text')}</p>
            <div className="mt-8 flex flex-wrap gap-2" role="radiogroup" aria-label={t('contrib_type')}>
              {types.map(({ id, icon: Ic, label }) => (
                <button
                  key={id} type="button" role="radio" aria-checked={tipo === id} onClick={() => setTipo(id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tipo === id ? 'border-brand bg-brand text-brand-ink' : 'border-border text-ink-muted hover:border-brand hover:text-brand'}`}
                >
                  <Ic size={15} />{label}
                </button>
              ))}
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="flex h-full flex-col items-start justify-center gap-4">
              <p className="text-ink-muted">{t('contrib_login')}</p>
              <Link to="/login" state={{ from: '/' }} className="btn-primary">{t('login')}</Link>
            </div>
          ) : sent ? (
            <div className="flex h-full items-center justify-center">
              <p className="flex items-center gap-2 text-lg font-semibold text-trail-easy"><CheckCircle2 size={22} />{t('contrib_sent')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <input required placeholder={t('contrib_trail')} value={form.trilha} onChange={set('trilha')} className={lineInput} />
              <textarea required rows={3} maxLength={2000} placeholder={t('contrib_message')} value={form.mensagem} onChange={set('mensagem')} className={`${lineInput} resize-none`} />
              {error && <p className="text-sm font-semibold text-trail-hard">{error}</p>}
              <button className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-semibold uppercase tracking-wide text-brand-ink shadow-md hover:brightness-110 transition-all duration-300">
                {t('contrib_send')}<Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ════════ Voltar ao topo (aparece depois do hero) ════════ */
function BackToTop() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('back_to_top')} title={t('back_to_top')}
      className={`fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg transition-all duration-300 hover:opacity-100 ${show ? 'opacity-60 translate-y-0' : 'pointer-events-none opacity-0 translate-y-3'}`}
    >
      <ChevronUp size={20} />
    </button>
  );
}

export function Home() {
  return (
    <Layout>
      <Hero />
      <StartHere />
      <Featured />
      <Stats />
      <Contribute />
      <BackToTop />
    </Layout>
  );
}
