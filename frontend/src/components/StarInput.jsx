import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

// Escolha de nota com meia estrela: a metade esquerda de cada estrela vale n - 0,5 e a direita vale n.
// Pelo teclado, as setas mudam de 0,5 em 0,5.
export function StarInput({ value, onChange, size = 28 }) {
  const { t, i18n } = useTranslation();
  const [hover, setHover] = useState(null);
  const shown = hover ?? value ?? 0;
  const set = v => onChange(Math.max(0.5, Math.min(5, v)));

  const onKey = e => {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
    if (!step) return;
    e.preventDefault();
    set((value ?? 0) + step);
  };

  return (
    <div
      role="slider" tabIndex={0} aria-label={t('review_rating')} aria-valuemin={0.5} aria-valuemax={5} aria-valuenow={value ?? 0}
      aria-valuetext={value ? t('rating_label', { value: value.toLocaleString(i18n.language) }) : t('review_pick_rating')}
      onKeyDown={onKey} onMouseLeave={() => setHover(null)}
      className="inline-flex items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {[1, 2, 3, 4, 5].map(n => {
        const fill = Math.max(0, Math.min(1, shown - (n - 1)));
        return (
          <span key={n} className="relative inline-block cursor-pointer" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-border" />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="fill-gold text-gold" />
              </span>
            )}
            {/* duas metades clicáveis */}
            <span className="absolute inset-y-0 left-0 w-1/2" onMouseEnter={() => setHover(n - 0.5)} onClick={() => set(n - 0.5)} />
            <span className="absolute inset-y-0 right-0 w-1/2" onMouseEnter={() => setHover(n)} onClick={() => set(n)} />
          </span>
        );
      })}
      {value != null && <span className="ml-2 text-sm font-semibold text-ink tabular-nums">{value.toLocaleString(i18n.language)}</span>}
    </div>
  );
}
