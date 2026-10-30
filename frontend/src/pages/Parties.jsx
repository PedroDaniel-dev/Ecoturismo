import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { PartyCard, InviteCard } from '../components/party/PartyCards';
import { useAuth } from '../context/AuthContext';
import { useTrails } from '../context/TrailsContext';
import { useInvites } from '../context/InvitesContext';
import { partyApi, todayIso } from '../utils/partyApi';

const TABS = [
  { id: 'proximas', label: 'parties_tab_upcoming' },
  { id: 'passadas', label: 'parties_tab_past' },
  { id: 'convites', label: 'parties_tab_invites' },
];

export function Parties() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <PartiesPage />;
}

function PartiesPage() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { trailById } = useTrails();
  const { pending } = useInvites();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(x => x.id === params.get('aba')) ? params.get('aba') : 'proximas';
  const [parties, setParties] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => partyApi(token).mine()
    .then(r => { setParties(r); setError(false); })
    .catch(() => { setParties([]); setError(true); }), [token]);

  useEffect(() => { load(); }, [load]);

  const today = todayIso();
  const upcoming = (parties || []).filter(p => p.data >= today).sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
  const past = (parties || []).filter(p => p.data < today).sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario));
  const list = tab === 'proximas' ? upcoming : past;

  return (
    <Layout>
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">{t('parties_kicker')}</p>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{t('parties_title')}</h1>
              <p className="mt-3 text-lg text-ink-muted">{t('parties_subtitle')}</p>
            </div>
            <Link to="/parties/nova" className="btn-primary self-start md:self-auto"><Plus size={18} />{t('party_new')}</Link>
          </header>

          <div role="tablist" className="mt-10 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map(x => (
              <button
                key={x.id} role="tab" aria-selected={tab === x.id}
                onClick={() => setParams(x.id === 'proximas' ? {} : { aba: x.id }, { replace: true })}
                className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === x.id ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                {t(x.label)}
                {x.id === 'convites' && pending.length > 0 && (
                  <span className="rounded-full bg-trail-hard px-2 py-0.5 text-[11px] font-bold text-white">{pending.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'convites' ? (
            <InvitesTab onAccepted={load} />
          ) : parties === null ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map(i => <div key={i} className="map-skeleton h-80 rounded-xl" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-ink-muted">{t(error ? 'parties_error' : tab === 'proximas' ? 'parties_empty_upcoming' : 'parties_empty_past')}</p>
              {!error && tab === 'proximas' && <Link to="/parties/nova" className="btn-ghost mt-5"><Plus size={16} />{t('party_new')}</Link>}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(p => <PartyCard key={p.id} party={p} trail={trailById(p.trilhaId)} meId={user.id} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InvitesTab({ onAccepted }) {
  const { t } = useTranslation();
  const { trailById } = useTrails();
  const { invites, pending, respond, reload } = useInvites();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const answered = (invites || []).filter(c => c.status !== 'PENDENTE');

  useEffect(() => { reload(); }, [reload]);

  const onRespond = async (id, accept) => {
    setBusyId(id); setError('');
    try {
      await respond(id, accept);
      if (accept) onAccepted();
    } catch (e) { setError(t('save_error')); }
    setBusyId(null);
  };

  if (invites === null) {
    return <div className="mt-8 space-y-4" aria-hidden="true">{[0, 1].map(i => <div key={i} className="map-skeleton h-32 rounded-2xl" />)}</div>;
  }

  return (
    <div className="mt-8 max-w-4xl">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">{t('invites_pending')} ({pending.length})</h2>
      {error && <p className="mb-4 text-sm font-semibold text-trail-hard">{error}</p>}
      {pending.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-ink-muted">{t('invites_empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map(c => <InviteCard key={c.id} invite={c} trail={trailById(c.party.trilhaId)} onRespond={onRespond} busy={busyId === c.id} />)}
        </div>
      )}

      {answered.length > 0 && (
        <details className="group mt-10">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-ink">
            <ChevronDown size={16} className="-rotate-90 transition group-open:rotate-0" />
            {t('invites_answered')} ({answered.length})
          </summary>
          <div className="mt-4 space-y-4">
            {answered.map(c => <InviteCard key={c.id} invite={c} trail={trailById(c.party.trilhaId)} />)}
          </div>
        </details>
      )}
    </div>
  );
}
