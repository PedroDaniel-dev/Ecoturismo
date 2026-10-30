import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Star } from 'lucide-react';
import { TrailCardFrame } from '../TrailCard';
import { avatarFor } from '../../utils/trailArt';

// datas do backend: "2024-03-10" (LocalDate) ou "2024-03-10T09:40:00" (LocalDateTime)
export const parseDate = s => new Date(s.length === 10 ? `${s}T12:00:00` : s);

export function useFormatDate() {
  const { i18n } = useTranslation();
  return s => parseDate(s).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
}

// Nota de 0,5 a 5: cada estrela é preenchida inteira, pela metade ou nada
export function Stars({ value, size = 16, className = '' }) {
  const { t, i18n } = useTranslation();
  const v = Number(value);
  return (
    <span className={`flex items-center gap-0.5 ${className}`} role="img" aria-label={t('rating_label', { value: v.toLocaleString(i18n.language) })}>
      {[1, 2, 3, 4, 5].map(n => {
        const fill = Math.max(0, Math.min(1, v - (n - 1)));
        return (
          <span key={n} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-border" />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="fill-gold text-gold" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function DateFooter({ date }) {
  const fmt = useFormatDate();
  return (
    <div className="mt-auto pt-3 border-t border-border flex items-center text-sm font-medium text-ink min-h-[2.25rem]">
      {date && <><CalendarDays size={15} className="mr-1.5 text-brand" />{fmt(date)}</>}
    </div>
  );
}

const Title = ({ children }) => (
  <h3 className="text-lg font-bold text-ink leading-snug mb-1 group-hover:text-brand transition-colors">{children}</h3>
);

export function ReviewCard({ trail, review }) {
  const { t } = useTranslation();
  return (
    <TrailCardFrame trail={trail}>
      <Title>{trail.name}</Title>
      <Stars value={review.avaliacao} className="mb-2" />
      <p className={`text-sm line-clamp-3 leading-relaxed mb-3 flex-grow ${review.comentario ? 'text-ink-muted' : 'text-ink-muted/70 italic'}`}>
        {review.comentario ? `“${review.comentario}”` : t('no_comment')}
      </p>
      <DateFooter date={review.data} />
    </TrailCardFrame>
  );
}

const STATUS_STYLE = {
  CONCLUIDA: 'bg-trail-easy/15 text-trail-easy',
  PLANEJADA: 'bg-gold/15 text-brand',
  CANCELADA: 'bg-surface-2 text-ink-muted',
};

export function VisitCard({ trail, visit }) {
  const { t } = useTranslation();
  return (
    <TrailCardFrame trail={trail}>
      <Title>{trail.name}</Title>
      <p className="flex items-center text-sm text-ink-muted mb-3">
        <MapPin size={14} className="mr-1.5 text-brand shrink-0" /><span className="truncate">{trail.location}</span>
      </p>
      <div className="flex items-start justify-between gap-3 mb-3 flex-grow">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[visit.status]}`}>
          {t(`status_${visit.status}`)}
        </span>
        {visit.avaliacao != null && <Stars value={visit.avaliacao} />}
      </div>
      <DateFooter date={visit.data} />
    </TrailCardFrame>
  );
}

export function PhotoCard({ trail, photo }) {
  return (
    <TrailCardFrame trail={trail} image={photo.url}>
      <Title>{trail.name}</Title>
      <p className="text-sm line-clamp-2 text-ink-muted leading-relaxed mb-3 flex-grow">{photo.legenda}</p>
      <DateFooter date={photo.criadoEm} />
    </TrailCardFrame>
  );
}

// Pessoa na aba Amigos: leva ao perfil dela
export function PersonCard({ person }) {
  return (
    <Link
      to={`/usuarios/${person.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <img src={person.fotoUrl || avatarFor(person.nome)} alt="" className="w-14 h-14 shrink-0 rounded-full object-cover ring-2 ring-brand/30" />
      <span className="min-w-0 truncate font-semibold text-ink group-hover:text-brand transition-colors">{person.nome}</span>
    </Link>
  );
}
