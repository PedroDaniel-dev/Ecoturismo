import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, Clock, Ruler, ShieldAlert, Trash2, TrendingUp } from 'lucide-react';
import { Layout } from '../components/Layout';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { PartyCard } from '../components/party/PartyCards';
import { InvitePicker, ConfirmDialog } from '../components/party/PartyDialogs';
import { Label, ErrorText, errorText } from '../components/profile/ProfileDialogs';
import { useAuth } from '../context/AuthContext';
import { useTrails } from '../context/TrailsContext';
import { api } from '../utils/api';
import { partyApi, todayIso, hhmm, sendInvites } from '../utils/partyApi';

export function PartyForm() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const { id } = useParams();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // key: trocar de "editar" para "nova" (ou de party) recomeça o formulário do zero
  return <PartyFormPage key={id || 'nova'} id={id} />;
}

function PartyFormPage({ id }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { trails, trailById } = useTrails();
  const p = useMemo(() => partyApi(token), [token]);
  const editing = !!id;

  const [form, setForm] = useState({ nome: '', descricao: '', trilhaId: '', data: '', horario: '' });
  const [status, setStatus] = useState(editing ? 'loading' : 'ready'); // loading | ready | forbidden | not_found | error
  const [friends, setFriends] = useState(null);
  const [exclude, setExclude] = useState([]); // membros e quem já tem convite pendente não aparecem para convidar
  const [friendIds, setFriendIds] = useState([]);
  const [emails, setEmails] = useState([]);
  const [dangers, setDangers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    let alive = true;
    p.friends(user.id).then(r => alive && setFriends(r)).catch(() => alive && setFriends([]));
    return () => { alive = false; };
  }, [p, user.id]);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    Promise.all([p.get(id), p.invites(id)])
      .then(([party, invites]) => {
        if (!alive) return;
        if (party.lider.id !== user.id) { setStatus('forbidden'); return; }
        setForm({ nome: party.nome, descricao: party.descricao || '', trilhaId: String(party.trilhaId), data: party.data, horario: hhmm(party.horario) });
        setExclude([...party.membros.map(m => m.id), ...invites.filter(c => c.status === 'PENDENTE').map(c => c.convidado.id)]);
        setStatus('ready');
      })
      .catch(e => alive && setStatus(e.status === 404 ? 'not_found' : e.status === 403 ? 'forbidden' : 'error'));
    return () => { alive = false; };
  }, [editing, id, p, user.id]);

  // avisos de perigo ativos da trilha escolhida, para a prévia
  useEffect(() => {
    if (!form.trilhaId) { setDangers(0); return; }
    let alive = true;
    api(`/avisos/trilha/${form.trilhaId}`).then(r => alive && setDangers(r.length)).catch(() => alive && setDangers(0));
    return () => { alive = false; };
  }, [form.trilhaId]);

  const sorted = useMemo(() => [...trails].sort((a, b) => a.name.localeCompare(b.name)), [trails]);
  const trail = form.trilhaId ? trailById(form.trilhaId) : null;

  const submit = async e => {
    e.preventDefault();
    if (!form.nome.trim() || !form.trilhaId || !form.data || !form.horario) { setError(t('party_required')); return; }
    setBusy(true); setError('');
    try {
      const body = { nome: form.nome.trim(), descricao: form.descricao.trim(), trilhaId: Number(form.trilhaId), data: form.data, horario: form.horario };
      const saved = editing ? await p.update(id, body) : await p.create(body);
      const failedInvites = await sendInvites(p, saved.id, { friendIds, emails });
      navigate(`/parties/${saved.id}`, { state: { failedInvites, sentInvites: friendIds.length + emails.length - failedInvites } });
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  };

  const remove = async () => {
    await p.remove(id);
    navigate('/parties');
  };

  if (status !== 'ready') {
    return (
      <Layout>
        <div className="container mx-auto px-4 pt-40 pb-24 text-center">
          {status === 'loading' ? <div className="map-skeleton mx-auto h-[480px] max-w-4xl rounded-3xl" aria-hidden="true" /> : (
            <>
              <p className="text-lg text-ink-muted">{t({ forbidden: 'party_only_leader_edit', not_found: 'party_not_found', error: 'parties_error' }[status])}</p>
              <Link to="/parties" className="btn-ghost mt-6">{t('party_back')}</Link>
            </>
          )}
        </div>
      </Layout>
    );
  }

  const outOfHours = trail?.opensAtRaw && form.horario
    && (form.horario < trail.opensAtRaw || (trail.closesAtRaw && form.horario >= trail.closesAtRaw));
  const hoursText = trail?.closesAt ? t('hours_range', { from: trail.opensAt, to: trail.closesAt }) : t('hours_from', { from: trail?.opensAt });

  return (
    <Layout>
      <div className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <Link
            to={editing ? `/parties/${id}` : '/parties'}
            className="mb-6 inline-flex items-center gap-1 rounded-full border border-border bg-surface py-2 pl-2 pr-4 text-sm font-semibold text-ink-muted shadow-sm transition hover:border-brand hover:text-brand"
          >
            <ChevronLeft size={20} />{t('back')}
          </Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">{t(editing ? 'party_edit' : 'party_new')}</h1>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <form onSubmit={submit} className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div>
                  <Label htmlFor="party-name">{t('party_name')}</Label>
                  <input id="party-name" value={form.nome} onChange={set('nome')} maxLength={80} required placeholder={t('party_name_placeholder')} className="input" />
                </div>
                <div>
                  <Label htmlFor="party-desc">{t('party_description')}</Label>
                  <textarea id="party-desc" value={form.descricao} onChange={set('descricao')} maxLength={250} rows={3} className="input resize-none" />
                  <p className="mt-1 text-right text-xs tabular-nums text-ink-muted">{form.descricao.length}/250</p>
                </div>
                <div>
                  <Label htmlFor="party-trail">{t('party_trail')}</Label>
                  <select id="party-trail" value={form.trilhaId} onChange={set('trilhaId')} required className="input">
                    <option value="">{t('party_pick_trail')}</option>
                    {sorted.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="party-date">{t('party_date')}</Label>
                    <input id="party-date" type="date" value={form.data} onChange={set('data')} min={todayIso()} required className="input" />
                  </div>
                  <div>
                    <Label htmlFor="party-time">{t('party_time')}</Label>
                    <input id="party-time" type="time" value={form.horario} onChange={set('horario')} required className="input" />
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <h2 className="mb-5 font-display text-2xl font-semibold text-ink">{t('party_invite')}</h2>
                <InvitePicker
                  friends={friends} exclude={[user.id, ...exclude]}
                  friendIds={friendIds} setFriendIds={setFriendIds} emails={emails} setEmails={setEmails}
                />
              </div>

              <div className="mt-8 space-y-4 border-t border-border pt-6">
                <ErrorText>{error}</ErrorText>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {editing ? (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-trail-hard hover:underline">
                      <Trash2 size={16} />{t('party_delete')}
                    </button>
                  ) : <span />}
                  <div className="flex justify-end gap-3">
                    <Link to={editing ? `/parties/${id}` : '/parties'} className="btn-ghost px-5 py-2.5">{t('cancel')}</Link>
                    <button disabled={busy} className="btn-primary px-5 py-2.5 disabled:opacity-60">{t(editing ? 'save' : 'party_create')}</button>
                  </div>
                </div>
              </div>
            </form>

            {/* prévia ao vivo do card e o que vale saber da trilha antes de marcar */}
            <aside className="space-y-4 lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">{t('party_preview')}</p>
              <PartyCard party={form} trail={trail} meId={user.id} asLink={false} />
              {trail && (
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
                  <p className="font-bold text-ink">{t('party_trail_info')}</p>
                  <div className="flex flex-wrap items-center gap-3 text-ink">
                    <DifficultyBadge difficulty={trail.difficulty} />
                    {trail.time && <span className="flex items-center"><Clock size={15} className="mr-1.5 text-brand" />{trail.time}</span>}
                    {trail.length && <span className="flex items-center"><Ruler size={15} className="mr-1.5 text-brand" />{trail.length}</span>}
                    {trail.altitude && <span className="flex items-center"><TrendingUp size={15} className="mr-1.5 text-brand" />{trail.altitude}</span>}
                  </div>
                  {dangers > 0 && (
                    <Link to={`/trilhas/${trail.id}`} className="flex items-center gap-2 font-semibold text-trail-hard hover:underline">
                      <ShieldAlert size={16} />{t('party_dangers_count', { count: dangers })}
                    </Link>
                  )}
                  {outOfHours && (
                    <p className="flex items-start gap-2 font-semibold text-trail-moderate">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />{t('party_hours_warning', { hours: hoursText })}
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t('party_delete_title', { name: form.nome })} text={t('party_delete_text')} confirmLabel={t('party_delete')}
          onConfirm={remove} onClose={() => setConfirmDelete(false)}
        />
      )}
    </Layout>
  );
}
