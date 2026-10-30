import { useTranslation } from 'react-i18next';
import { difficultyKey } from '../utils/trailFormat';

export const difficultyClasses = {
  'Fácil': 'bg-trail-easy/15 text-trail-easy ring-trail-easy/30',
  'Moderado': 'bg-trail-moderate/15 text-trail-moderate ring-trail-moderate/30',
  'Difícil': 'bg-trail-hard/15 text-trail-hard ring-trail-hard/30',
};

export function DifficultyBadge({ difficulty, className = '' }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${difficultyClasses[difficulty] || 'bg-surface-2 text-ink-muted'} ${className}`}>
       {t(difficultyKey(difficulty))}
    </span>
  );
}
