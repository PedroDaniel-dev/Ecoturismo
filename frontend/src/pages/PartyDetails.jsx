import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Crown, Hourglass, LogOut, MapPin, Pencil, ShieldAlert, Trash2, UserPlus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { PersonRow, InviteStatus } from '../components/party/PartyCards';
import { InviteDialog, ConfirmDialog } from '../components/party/PartyDialogs';
import { parseDate } from '../components/profile/ProfileCards';
import { useAuth } from '../context/AuthContext';
import { useTrails } from '../context/TrailsContext';
import { api } from '../utils/api';
import { partyApi, todayIso, hhmm, sendInvites } from '../utils/partyApi';

export function PartyDetails() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <PartyDetailsPage />;
}

// "em 9 dias", "amanhã", "hoje", "há 3 dias"
const countdown = (iso, lang) => {
  const days = Math.round((parseDate(iso) - parseDate(todayIso())) / 86400000);
  return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(days, 'day');
};

const Box = ({ title, action, children }) => (
  <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

function PartyDetailsPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, token } = useAuth();
  const { trailById } = useTrails();
  const p = useMemo(() => partyApi(token), [token]);

  const [party, setParty] = useState(null);
  const [invites, setInvites] = useState([]);
  const [dangers, setDangers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | not_found | error
  const [dialog, setDialog] = useState(null); // invite | leave | delete
  const [notice, setNotice] = useState(null);

  // quem acabou de criar/editar volta aqui sabendo quantos convites foram e quantos falharam
  useEffect(() => {
    if (!state) return;
    if (state.failedInvites) setNotice({ error: true, text: t('party_failed_invites', { count: state.failedInvites }) });
    else if (state.sentInvites) setNotice({ text: t('party_invites_sent') });
  }, [state, t]);

  const loadInvites = useCallback(() => p.invites(id).then(setInvites).catch(() => {}), [p, id]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    p.get(id)
      .then(r => {
        if (!alive) return;
        setParty(r); setStatus('ready');
        api(`/avisos/trilha/${r.trilhaId}`).then(d => alive && setDangers(d)).catch(() => {});
      })
      .catch(e => alive && setStatus(e.status === 404 ? 'not_found' : e.status === 403 ? 'forbidden' : 'error'));
    loadInvites();
    return () => { alive = false; };
  }, [p, id, loadInvites]);

  const loadFriends = useCallback(() => p.friends(user.id), [p, user.id]);
  const closeDialog = useCallback(() => setDialog(null), []);

  if (status !== 'ready') {
    return (
      <Layout>
        <div className="container mx-auto px-4 pt-32 pb-24">
          {status === 'loading' ? <div className="map-skeleton h-[420px] rounded-3xl" aria-hidden="true" /> : (
            <div className="pt-8 text-center">
              <p className="text-lg text-ink-muted">{t({ forbidden: 'party_forbidden', not_found: 'party_not_found', error: 'parties_error' }[status])}</p>
              <Link to="/parties" className="btn-ghost mt-6">{t('party_back')}</Link>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const trail = trailById(party.trilhaId);
  const leader = party.lider.id === user.id;
  const past = party.data < todayIso();
  const longDate = parseDate(party.data).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  // quem já é membro não precisa aparecer de novo para convidar; pendentes também não
  const exclude = [...party.membros.map(m => m.id), ...invites.filter(c => c.status === 'PENDENTE').map(c => c.convidado.id)];

  const invite = async who => {
    const failed = await sendInvites(p, party.id, who);
    await loadInvites();
    setNotice(failed ? { error: true, text: t('party_failed_invites', { count: failed }) } : { text: t('party_invites_sent') });
    setDialog(null);
  };

  const leave = async () => { await p.leave(party.id); navigate('/parties'); };
  const remove = async () => { await p.remove(party.id); navigate('/parties'); };

  return (
    <Layout>
      <div className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <Link to="/parties" className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-surface py-2 pl-2 pr-4 text-sm font-semibold text-ink-muted shadow-sm transition hover:border-brand hover:text-brand">
            <ChevronLeft size={20} />{t('party_back')}
          </Link>

          {/* ── banner: foto da trilha com o nome e quando ── */}
          <header className="relative overflow-hidden rounded-3xl bg-surface-2 shadow-sm">
            {trail && <img src={trail.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
            <div className="relative flex min-h-[18rem] flex-col justify-end p-6 sm:min-h-[22rem] sm:p-10">
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white break-words md:text-5xl">{party.nome}</h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-white/90">
                <span className="flex items-center gap-2"><CalendarDays size={18} />{longDate}</span>
                <span className="flex items-center gap-2"><Clock size={18} />{hhmm(party.horario)}</span>
                <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${past ? 'bg-white/15' : 'bg-brand text-brand-ink'}`}>
                  <Hourglass size={14} />{countdown(party.data, i18n.language)}
                </span>
              </p>
            </div>
          </header>

          {notice && (
            <p className={`mt-6 rounded-xl px-4 py-3 text-sm font-semibold ${notice.error ? 'bg-trail-hard/10 text-trail-hard' : 'bg-trail-easy/10 text-trail-easy'}`}>{notice.text}</p>
          )}

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <Box title={t('party_about')}>
                <p className={`whitespace-pre-line leading-relaxed ${party.descricao ? 'text-ink' : 'italic text-ink-muted'}`}>{party.descricao || t('party_no_description')}</p>
              </Box>

              {trail && (
                <Box title={t('party_trail')}>
                  <Link to={`/trilhas/${trail.id}`} className="group flex items-center gap-4">
                    <img src={trail.images[0]} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-32" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-ink transition-colors group-hover:text-brand">{trail.name}</p>
                      <p className="flex items-center text-sm text-ink-muted"><MapPin size={14} className="mr-1.5 shrink-0 text-brand" /><span className="truncate">{trail.location}</span></p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink">
                        <DifficultyBadge difficulty={trail.difficulty} />
                        {trail.time && <span className="flex items-center"><Clock size={14} className="mr-1.5 text-brand" />{trail.time}</span>}
                      </div>
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                </Box>
              )}

              {dangers.length > 0 && (
                <section className="rounded-2xl border border-trail-hard/30 bg-trail-hard/5 p-5">
                  <h2 className="mb-4 flex items-center gap-2 font-bold text-ink"><ShieldAlert size={18} className="text-trail-hard" />{t('party_trail_dangers', { count: dangers.length })}</h2>
                  <ul className="space-y-3">
                    {dangers.map(d => (
                      <li key={d.id} className="rounded-xl border border-trail-hard/20 bg-surface p-4 text-sm">
                        <p className="text-ink">{d.mensagem}</p>
                        <p className="mt-1 text-xs text-ink-muted">{d.autor?.nome} · {new Date(d.criadoEm).toLocaleDateString(i18n.language)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <Box title={t('party_organizer')}>
                <ul><PersonRow person={party.lider} note={leader ? t('you') : null}><Crown size={18} className="shrink-0 text-gold" /></PersonRow></ul>
              </Box>

              <Box title={t('party_participants', { count: party.membros.length })}>
                <ul className="space-y-2">
                  {party.membros.map(m => <PersonRow key={m.id} person={m} note={m.id === user.id ? t('you') : null} />)}
                </ul>
              </Box>

              <Box
                title={t('party_invites')}
                action={!past && (
                  <button onClick={() => setDialog('invite')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                    <UserPlus size={16} />{t('party_invite')}
                  </button>
                )}
              >
                {invites.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('party_no_invites')}</p>
                ) : (
                  <ul className="space-y-2">
                    {invites.map(c => <PersonRow key={c.id} person={c.convidado}><InviteStatus status={c.status} /></PersonRow>)}
                  </ul>
                )}
              </Box>

              <div className="flex flex-wrap gap-3">
                {leader ? (
                  <>
                    <Link to={`/parties/${party.id}/editar`} className="btn-ghost flex-1 px-5 py-2.5"><Pencil size={16} />{t('edit')}</Link>
                    <button onClick={() => setDialog('delete')} className="btn-ghost flex-1 px-5 py-2.5 hover:border-trail-hard hover:text-trail-hard"><Trash2 size={16} />{t('delete')}</button>
                  </>
                ) : (
                  <button onClick={() => setDialog('leave')} className="btn-ghost w-full px-5 py-2.5 hover:border-trail-hard hover:text-trail-hard"><LogOut size={16} />{t('party_leave')}</button>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {dialog === 'invite' && <InviteDialog loadFriends={loadFriends} exclude={[user.id, ...exclude]} onSubmit={invite} onClose={closeDialog} />}
      {dialog === 'leave' && (
        <ConfirmDialog title={t('party_leave_title', { name: party.nome })} text={t('party_leave_text')} confirmLabel={t('party_leave')} onConfirm={leave} onClose={closeDialog} />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog title={t('party_delete_title', { name: party.nome })} text={t('party_delete_text')} confirmLabel={t('party_delete')} onConfirm={remove} onClose={closeDialog} />
      )}
    </Layout>
  );
}
