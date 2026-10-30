import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { avatarFor } from '../utils/trailArt';
import { Stars, useFormatDate } from './profile/ProfileCards';
import { StarInput } from './StarInput';

const today = () => new Date().toISOString().slice(0, 10);

// Avaliações da trilha = visitas concluídas com nota (tabela VISITA). Ver é público; avaliar exige login
// e registra a visita naquela data (uma por trilha por dia).
export function ReviewsSection({ trailId }) {
  const { t, i18n } = useTranslation();
  const { user, token, isLoggedIn } = useAuth();
  const location = useLocation();
  const fmt = useFormatDate();
  const [list, setList] = useState(null);
  const [rating, setRating] = useState(null);
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/trilhas/${trailId}/avaliacoes`, { token }).then(setList).catch(() => setList([]));
  }, [trailId, token]);
  useEffect(load, [load]);

  const submit = async e => {
    e.preventDefault();
    if (!rating) { setError(t('review_pick_rating')); return; }
    setBusy(true); setError('');
    try {
      await api('/visitas/concluida', { method: 'POST', token, body: { trilhaId: trailId, data: date, avaliacao: rating, comentario: text.trim() || null } });
      setRating(null); setText(''); setDate(today());
      load();
    } catch (err) {
      setError(err.message && !err.message.startsWith('HTTP') ? err.message : t('save_error'));
    }
    setBusy(false);
  };

  const avg = list?.length ? list.reduce((s, r) => s + Number(r.avaliacao), 0) / list.length : null;

  return (
    <div>
      <h3 className="text-xl font-bold text-ink mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center"><MessageCircle size={20} className="mr-2 text-brand" />{t('reviews_title')}</span>
        {list && <span className="text-sm font-semibold text-ink-muted">({list.length})</span>}
        {avg != null && (
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Stars value={Math.round(avg * 2) / 2} />{avg.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}
          </span>
        )}
      </h3>

      {isLoggedIn ? (
        <form onSubmit={submit} className="mb-8 flex gap-3">
          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full shrink-0 object-cover" />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <StarInput value={rating} onChange={setRating} />
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                {t('review_date')}
                <input type="date" required value={date} max={today()} onChange={e => setDate(e.target.value)} className="input w-auto py-2" />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input value={text} onChange={e => setText(e.target.value)} maxLength={250} className="input" placeholder={t('comment_placeholder')} />
              <button disabled={busy} className="btn-primary shrink-0 disabled:opacity-60"><Send size={16} />{t('comment_send')}</button>
            </div>
            {error && <p className="text-sm font-semibold text-trail-hard">{error}</p>}
          </div>
        </form>
      ) : (
        <p className="mb-8 text-sm text-ink-muted">
          <Link to="/login" state={{ from: location.pathname }} className="text-brand font-semibold hover:underline">{t('login_to_review')}</Link>
        </p>
      )}

      {list === null ? (
        <div className="space-y-4" aria-hidden="true">{[0, 1].map(i => <div key={i} className="map-skeleton h-20 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-ink-muted">{t('reviews_empty')}</p>
      ) : (
        <ul className="space-y-5">
          {list.map(r => (
            <li key={r.visitaId} className="flex gap-3">
              <Link to={`/usuarios/${r.usuario.id}`} className="shrink-0">
                <img src={r.usuario.fotoUrl || avatarFor(r.usuario.nome)} alt="" className="w-10 h-10 rounded-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0 rounded-2xl bg-surface p-4 border border-border">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link to={`/usuarios/${r.usuario.id}`} className="font-semibold text-ink text-sm hover:text-brand">{r.usuario.nome}</Link>
                  <p className="text-xs text-ink-muted">{fmt(r.data)}</p>
                </div>
                <Stars value={r.avaliacao} className="mt-1" />
                {r.comentario && <p className="mt-2 text-ink-muted text-sm leading-relaxed break-words">{r.comentario}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
