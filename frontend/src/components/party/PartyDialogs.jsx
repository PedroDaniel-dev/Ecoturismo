import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Modal, Label, ErrorText, Actions, errorText } from '../profile/ProfileDialogs';
import { avatarOf } from './PartyCards';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Escolha de quem convidar: amigos (pelo id) e qualquer pessoa cadastrada (pelo e-mail).
// `exclude`: ids de quem já é membro ou já tem convite pendente/aceito.
export function InvitePicker({ friends, exclude = [], friendIds, setFriendIds, emails, setEmails }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const options = (friends || []).filter(f => !exclude.includes(f.id));

  const toggle = id => setFriendIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));

  const addEmail = () => {
    const v = email.trim().toLowerCase();
    if (!v) return;
    if (!EMAIL.test(v)) { setError(t('invalid_email')); return; }
    if (!emails.includes(v)) setEmails([...emails, v]);
    setEmail(''); setError('');
  };

  return (
    <div className="space-y-5">
      <div>
        <Label>{t('party_invite_friends')}</Label>
        {friends === null ? (
          <div className="grid gap-2 sm:grid-cols-2">{[0, 1].map(i => <div key={i} className="map-skeleton h-14 rounded-xl" />)}</div>
        ) : options.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('party_no_friends')}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map(f => {
              const on = friendIds.includes(f.id);
              return (
                <label key={f.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${on ? 'border-brand bg-brand/5 font-semibold text-ink' : 'border-border text-ink hover:border-brand/60'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="accent-[rgb(var(--brand))]" />
                  <img src={avatarOf(f)} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <span className="truncate">{f.nome}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="invite-email">{t('party_invite_email')}</Label>
        <div className="flex gap-2">
          <input
            id="invite-email" type="email" value={email} placeholder="email@exemplo.com" className="input"
            onChange={e => setEmail(e.target.value)}
            // Enter adiciona o e-mail em vez de enviar o formulário inteiro
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
          />
          <button type="button" onClick={addEmail} aria-label={t('party_add_email')} title={t('party_add_email')} className="btn-ghost shrink-0 px-4">
            <Plus size={18} />
          </button>
        </div>
        <ErrorText>{error}</ErrorText>
        {emails.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {emails.map(e => (
              <li key={e} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-ink">
                {e}
                <button type="button" onClick={() => setEmails(emails.filter(x => x !== e))} aria-label={t('remove')} className="rounded-full p-1 text-ink-muted hover:bg-surface hover:text-trail-hard">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Convidar mais gente para uma party que já existe (página de detalhes)
export function InviteDialog({ loadFriends, exclude, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [friends, setFriends] = useState(null);
  const [friendIds, setFriendIds] = useState([]);
  const [emails, setEmails] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadFriends().then(r => alive && setFriends(r)).catch(() => alive && setFriends([]));
    return () => { alive = false; };
  }, [loadFriends]);

  const submit = async e => {
    e.preventDefault();
    if (!friendIds.length && !emails.length) { setError(t('party_pick_someone')); return; }
    setBusy(true); setError('');
    try { await onSubmit({ friendIds, emails }); } catch (err) { setError(errorText(err, t)); setBusy(false); }
  };

  return (
    <Modal title={t('party_invite')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <InvitePicker friends={friends} exclude={exclude} friendIds={friendIds} setFriendIds={setFriendIds} emails={emails} setEmails={setEmails} />
        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('send')} busy={busy} />
      </form>
    </Modal>
  );
}

// Confirmação simples (sair, excluir)
export function ConfirmDialog({ title, text, confirmLabel, onConfirm, onClose, danger = true }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try { await onConfirm(); } catch (err) { setError(errorText(err, t)); setBusy(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="leading-relaxed text-ink-muted">{text}</p>
        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={confirmLabel} busy={busy} danger={danger} />
      </form>
    </Modal>
  );
}
