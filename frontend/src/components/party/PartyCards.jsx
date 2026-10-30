import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, MapPin, Users } from 'lucide-react';
import { DifficultyBadge } from '../DifficultyBadge';
import { parseDate } from '../profile/ProfileCards';
import { avatarFor } from '../../utils/trailArt';
import { hhmm } from '../../utils/partyApi';

export const avatarOf = u => u.fotoUrl || avatarFor(u.nome);

// Bloco de calendário (SÁB / 08 / NOV) que fica sobre a foto da trilha
export function DateTile({ date, className = '' }) {
  const { i18n } = useTranslation();
  const d = parseDate(date);
  const part = opts => d.toLocaleDateString(i18n.language, opts).replace('.', '');
  return (
    <span className={`flex w-14 flex-col items-center rounded-xl bg-surface/95 py-1.5 text-ink shadow-lg backdrop-blur ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-brand">{part({ weekday: 'short' })}</span>
      <span className="font-display text-2xl leading-none">{d.getDate()}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{part({ month: 'short' })}</span>
    </span>
  );
}

export function AvatarStack({ people, max = 4 }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex -space-x-2">
      {shown.map(u => <img key={u.id} src={avatarOf(u)} alt={u.nome} title={u.nome} className="h-8 w-8 rounded-full object-cover ring-2 ring-surface" />)}
      {rest > 0 && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink-muted ring-2 ring-surface">+{rest}</span>}
    </span>
  );
}

// Card da lista de parties; `asLink={false}` para a prévia do formulário
export function PartyCard({ party, trail, meId, asLink = true }) {
  const { t } = useTranslation();
  const leader = party.lider?.id === meId;
  const Root = asLink ? Link : 'div';
  return (
    <Root
      {...(asLink ? { to: `/parties/${party.id}` } : {})}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${asLink ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-500' : ''}`}
    >
      <div className="relative h-0 overflow-hidden bg-surface-2 pt-[56%]">
        {trail && <img src={trail.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
        {party.data && <DateTile date={party.data} className="absolute left-3 top-3" />}
        {leader && (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {t('party_leader')}
          </span>
        )}
      </div>

      <div className="flex flex-grow flex-col p-5">
        <h3 className="mb-1 text-lg font-bold leading-snug text-ink transition-colors group-hover:text-brand break-words">{party.nome || t('party_name_placeholder')}</h3>
        {trail && (
          <p className="mb-2 flex items-center text-sm text-ink-muted">
            <MapPin size={14} className="mr-1.5 shrink-0 text-brand" /><span className="truncate">{trail.name}</span>
          </p>
        )}
        <div className="mb-3 flex flex-grow flex-wrap items-start gap-3">
          {party.horario && <span className="flex items-center text-sm font-medium text-ink"><Clock size={15} className="mr-1.5 text-brand" />{hhmm(party.horario)}</span>}
          {trail && <DifficultyBadge difficulty={trail.difficulty} />}
        </div>
        {party.membros && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
            <AvatarStack people={party.membros} />
            <span className="truncate text-sm text-ink-muted">{leader ? t('party_by_you') : t('party_by', { name: party.lider.nome })}</span>
          </div>
        )}
      </div>
    </Root>
  );
}

export const INVITE_STATUS_STYLE = {
  PENDENTE: 'bg-trail-moderate/15 text-trail-moderate ring-trail-moderate/30',
  ACEITO: 'bg-trail-easy/15 text-trail-easy ring-trail-easy/30',
  RECUSADO: 'bg-surface-2 text-ink-muted ring-border',
};

export function InviteStatus({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${INVITE_STATUS_STYLE[status] || INVITE_STATUS_STYLE.RECUSADO}`}>
      {t(`invite_status_${status}`)}
    </span>
  );
}

// Convite recebido: quem convidou, a party e, se ainda pendente, aceitar/recusar
export function InviteCard({ invite, trail, onRespond, busy, compact = false }) {
  const { t, i18n } = useTranslation();
  const { party, remetente } = invite;
  const pending = invite.status === 'PENDENTE';
  const date = parseDate(party.data).toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <article className={`flex gap-4 rounded-2xl border border-border bg-surface shadow-sm ${compact ? 'flex-col p-3' : 'flex-col p-4 sm:flex-row sm:items-center'}`}>
      {!compact && trail && <img src={trail.images[0]} alt="" className="h-32 w-full shrink-0 rounded-xl object-cover sm:h-24 sm:w-32" />}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <img src={avatarOf(remetente)} alt="" className="h-6 w-6 rounded-full object-cover" />
          <span className="truncate">{t('invite_from', { name: remetente.nome })}</span>
        </p>
        <h3 className={`mt-1 font-bold text-ink break-words ${compact ? 'text-base' : 'text-lg'}`}>{party.nome}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {trail && <span className="flex items-center"><MapPin size={14} className="mr-1 text-brand" />{trail.name}</span>}
          <span>{date} · {hhmm(party.horario)}</span>
          {!compact && <span className="flex items-center"><Users size={14} className="mr-1 text-brand" />{t('party_members_count', { count: party.totalMembros })}</span>}
        </p>
      </div>
      {pending ? (
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onRespond(invite.id, false)} disabled={busy} className="btn-ghost px-4 py-2 text-sm disabled:opacity-60">{t('invite_decline')}</button>
          <button onClick={() => onRespond(invite.id, true)} disabled={busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{t('invite_accept')}</button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3">
          <InviteStatus status={invite.status} />
          {invite.status === 'ACEITO' && <Link to={`/parties/${party.id}`} className="text-sm font-semibold text-brand hover:underline">{t('see_party')}</Link>}
        </div>
      )}
    </article>
  );
}

// Pessoa numa lista lateral (organizador, participantes, convidados); leva ao perfil
export function PersonRow({ person, children, note }) {
  return (
    <li className="flex items-center gap-3">
      <Link to={`/usuarios/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 hover:text-brand">
        <img src={avatarOf(person)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{person.nome}</span>
          {note && <span className="block text-xs text-ink-muted">{note}</span>}
        </span>
      </Link>
      {children}
    </li>
  );
}
