import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Camera, ImagePlus, Trash2, X } from 'lucide-react';
import { useTrails } from '../../context/TrailsContext';
import { useAuth } from '../../context/AuthContext';
import { api as http } from '../../utils/api';
import { avatarFor } from '../../utils/trailArt';
import { useFormatDate } from './ProfileCards';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024; // mesmo limite do backend (spring.servlet.multipart.max-file-size)

// confere no navegador antes de enviar; o backend confere de novo pela assinatura do arquivo
const imageError = file => (!IMAGE_TYPES.includes(file.type) ? 'photo_type' : file.size > MAX_BYTES ? 'photo_too_big' : '');

// mensagem do backend quando houver (ex.: "A imagem deve ter no máximo 2 MB"), senão a genérica
export const errorText = (err, t) => (err?.message && !err.message.startsWith('HTTP') ? err.message : t('save_error'));

export function Modal({ title, onClose, children }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog" aria-modal="true" aria-labelledby="modal-title"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl p-6 animate-rise"
        style={{ animationDuration: '.25s' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 id="modal-title" className="font-display text-2xl font-semibold text-ink leading-tight">{title}</h2>
          <button onClick={onClose} aria-label={t('close')} className="p-2 -m-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-2 transition">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold uppercase tracking-[0.18em] text-ink-muted mb-2">{children}</label>
);

export const ErrorText = ({ children }) => (children ? <p className="text-sm font-semibold text-trail-hard">{children}</p> : null);

export function Actions({ onCancel, submitLabel, busy, danger }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn-ghost px-5 py-2.5">{t('cancel')}</button>
      <button disabled={busy} className={`btn-primary px-5 py-2.5 disabled:opacity-60 ${danger ? 'bg-trail-hard text-white' : ''}`}>{submitLabel}</button>
    </div>
  );
}

export function EditProfileDialog({ profile, api, onSaved, onClose }) {
  const { t } = useTranslation();
  const generated = avatarFor(profile.nome);
  const [nome, setNome] = useState(profile.nome);
  const [bio, setBio] = useState(profile.bio || '');
  const [file, setFile] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState(profile.fotoUrl || generated);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasPhoto = !removed && (file || (profile.fotoUrl && profile.fotoUrl !== generated));

  const pick = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const err = imageError(f);
    if (err) { setError(t(err)); return; }
    setFile(f); setRemoved(false); setPreview(URL.createObjectURL(f)); setError('');
  };

  const removePhoto = () => { setFile(null); setRemoved(true); setPreview(avatarFor(nome)); };

  const submit = async e => {
    e.preventDefault();
    if (nome.trim().length < 2) { setError(t('name_too_short')); return; }
    setBusy(true); setError('');
    try {
      const patch = {};
      if (file) Object.assign(patch, await api.uploadAvatar(file));
      else if (removed) Object.assign(patch, await api.removeAvatar());
      Object.assign(patch, await api.updateMe({ nome: nome.trim(), bio: bio.trim() }));
      onSaved(patch);
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('edit_profile')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-5">
          <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-brand/40" />
          <div className="flex flex-col items-start gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand hover:underline">
              <Camera size={16} />{t('change_photo')}
              <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pick} className="sr-only" />
            </label>
            {hasPhoto && (
              <button type="button" onClick={removePhoto} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-trail-hard">
                <Trash2 size={16} />{t('remove_photo')}
              </button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="profile-name">{t('name')}</Label>
          <input id="profile-name" value={nome} onChange={e => setNome(e.target.value)} maxLength={80} className="input" />
        </div>

        <div>
          <Label htmlFor="profile-bio">{t('bio')}</Label>
          <textarea
            id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3}
            placeholder={t('bio_placeholder')} className="input resize-none"
          />
          <p className="mt-1 text-right text-xs text-ink-muted tabular-nums">{bio.length}/280</p>
        </div>

        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('save')} busy={busy} />
      </form>
    </Modal>
  );
}

export function BlockDialog({ name, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try { await onConfirm(); } catch (err) { setError(errorText(err, t)); setBusy(false); }
  };

  return (
    <Modal title={t('block_title', { name })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-ink-muted leading-relaxed">{t('block_text', { name })}</p>
        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('block')} busy={busy} danger />
      </form>
    </Modal>
  );
}

const REASONS = ['SPAM', 'ASSEDIO', 'CONTEUDO_IMPROPRIO', 'PERFIL_FALSO', 'OUTRO'];

export function ReportDialog({ name, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!reason) { setError(t('report_pick_reason')); return; }
    setBusy(true); setError('');
    try { await onSubmit(reason, details.trim()); setSent(true); } catch (err) { setError(errorText(err, t)); }
    setBusy(false);
  };

  if (sent) {
    return (
      <Modal title={t('report_title', { name })} onClose={onClose}>
        <p className="text-ink-muted leading-relaxed mb-6">{t('report_sent')}</p>
        <div className="flex justify-end"><button onClick={onClose} className="btn-primary px-5 py-2.5">{t('close')}</button></div>
      </Modal>
    );
  }

  return (
    <Modal title={t('report_title', { name })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="block text-xs font-bold uppercase tracking-[0.18em] text-ink-muted mb-2">{t('report_reason')}</legend>
          <div className="space-y-1.5">
            {REASONS.map(r => (
              <label key={r} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition ${reason === r ? 'border-brand bg-brand/5 text-ink font-semibold' : 'border-border text-ink hover:border-brand/60'}`}>
                <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[rgb(var(--brand))]" />
                {t(`reason_${r}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Label htmlFor="report-details">{t('report_details')}</Label>
          <textarea id="report-details" value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={3} className="input resize-none" />
        </div>
        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('report_send')} busy={busy} danger />
      </form>
    </Modal>
  );
}

// Lista de pessoas (seguidores ou quem o perfil segue); cada uma leva ao próprio perfil.
export function PeopleDialog({ title, empty, load, onClose }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    let alive = true;
    load().then(r => alive && setList(r)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [load]);

  return (
    <Modal title={title} onClose={onClose}>
      {list === null ? (
        <div className="space-y-3">{[0, 1].map(i => <div key={i} className="map-skeleton h-12 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-ink-muted">{empty}</p>
      ) : (
        <ul className="-mx-2 space-y-1">
          {list.map(u => (
            <li key={u.id}>
              <Link to={`/usuarios/${u.id}`} onClick={onClose} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2 transition">
                <img src={u.fotoUrl || avatarFor(u.nome)} alt="" className="w-10 h-10 rounded-full object-cover" />
                <span className="font-semibold text-ink">{u.nome}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// A foto fica presa a uma visita (regra do banco), então só aparecem as trilhas que a pessoa visitou ou planejou visitar.
export function AddPhotoDialog({ onSubmit, onClose }) {
  const { t } = useTranslation();
  const { trailById } = useTrails();
  const { token } = useAuth();
  const [options, setOptions] = useState(null);
  const [trailId, setTrailId] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const err = imageError(f);
    if (err) { setError(t(err)); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setError('');
  };

  useEffect(() => {
    let alive = true;
    http('/visitas/minhas', { token })
      .then(visits => {
        const ids = [...new Set(visits.filter(v => v.status !== 'CANCELADA').map(v => v.trilhaId))];
        const list = ids.map(trailById).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
        if (!alive) return;
        setOptions(list);
        setTrailId(list[0]?.id ?? null);
      })
      .catch(() => alive && setOptions([]));
    return () => { alive = false; };
  }, [token, trailById]);

  const submit = async e => {
    e.preventDefault();
    if (!file) { setError(t('photo_pick')); return; }
    if (!trailId) return;
    setBusy(true); setError('');
    try { await onSubmit(trailId, file, caption.trim()); } catch (err) { setError(errorText(err, t)); setBusy(false); }
  };

  return (
    <Modal title={t('add_photo')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <label className="relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-2/50 text-ink-muted hover:border-brand hover:text-brand transition">
          {preview
            ? <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <span className="flex flex-col items-center gap-2 text-sm font-semibold"><ImagePlus size={28} />{t('photo_file')}</span>}
          <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pick} className="sr-only" />
        </label>

        <div>
          <Label htmlFor="photo-trail">{t('photo_trail')}</Label>
          {options === null ? (
            <div className="map-skeleton h-12 rounded-xl" />
          ) : options.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('photo_needs_visit')}</p>
          ) : (
            <select id="photo-trail" value={trailId ?? ''} onChange={e => setTrailId(Number(e.target.value))} className="input">
              {options.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
            </select>
          )}
        </div>

        <div>
          <Label htmlFor="photo-caption">{t('photo_caption')}</Label>
          <input id="photo-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={250} className="input" />
        </div>

        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('send')} busy={busy} />
      </form>
    </Modal>
  );
}

// Aviso de perigo sempre a partir de uma visita concluída: trilha e visita já vêm escolhidas, só falta contar o que houve.
export function DangerReportDialog({ trail, visit, onClose }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const fmt = useFormatDate();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (text.trim().length < 10) { setError(t('danger_too_short')); return; }
    setBusy(true); setError('');
    try {
      await http('/avisos', {
        method: 'POST', token,
        body: { tipo: 'PERIGO', trilha: trail.name, trilhaId: trail.id, visitaId: visit.id, mensagem: text.trim() },
      });
      setSent(true);
    } catch (err) { setError(errorText(err, t)); }
    setBusy(false);
  };

  if (sent) {
    return (
      <Modal title={t('danger_dialog_title')} onClose={onClose}>
        <p className="text-ink-muted leading-relaxed mb-6">{t('danger_sent')}</p>
        <div className="flex justify-end gap-3">
          <Link to="/avisos" className="btn-ghost px-5 py-2.5">{t('danger_see_all')}</Link>
          <button onClick={onClose} className="btn-primary px-5 py-2.5">{t('close')}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('danger_dialog_title')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-2/50 p-3">
          <img src={trail.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">{trail.name}</p>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <CalendarDays size={14} className="text-brand" />{t('danger_visit_on', { date: fmt(visit.data) })}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="danger-text">{t('danger_what')}</Label>
          <textarea
            id="danger-text" value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={5} autoFocus
            placeholder={t('danger_placeholder')} className="input resize-none"
          />
          <div className="mt-1 flex justify-between gap-3 text-xs text-ink-muted">
            <span>{t('danger_when_note')}</span>
            <span className="tabular-nums">{text.length}/2000</span>
          </div>
        </div>

        <ErrorText>{error}</ErrorText>
        <Actions onCancel={onClose} submitLabel={t('danger_send')} busy={busy} danger />
      </form>
    </Modal>
  );
}
