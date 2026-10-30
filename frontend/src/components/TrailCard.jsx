import { useRef } from 'react';
import { Link, useViewTransitionState } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { DifficultyBadge } from './DifficultyBadge';
import { rememberCard } from '../utils/cardToHero';

// Moldura comum dos cards de trilha (catálogo, avaliações, visitas, fotos): mesmo tamanho,
// mesma proporção da foto e mesmo hover. Só o conteúdo abaixo da foto muda (children).
// `image` troca a foto da trilha por outra (ex.: foto enviada pelo usuário).
export function TrailCardFrame({ trail, image, children, className = '' }) {
  const { t } = useTranslation();
  const href = `/trilhas/${trail.id}`;
  // só nomeia a view transition do card envolvido na navegação (ida ou volta), não de todos os cards da grade;
  // com outra foto não há imagem igual na página da trilha para animar
  const isTransitioning = useViewTransitionState(href) && !image;
  const frameRef = useRef(null);

  return (
    <Link
      to={href}
      viewTransition
      // sem View Transitions no navegador, a animação é feita em JS (utils/cardToHero)
      onClick={() => { if (!image) rememberCard(trail.id, frameRef.current); }}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${className}`}
    >
      {/* 4:3 da largura − 20px (a foto encolhe, o conteúdo fica igual) */}
      <div
        ref={frameRef}
        className="relative overflow-hidden bg-surface-2 h-0 pt-[calc(75%-20px)]"
        style={{ viewTransitionName: isTransitioning ? `trail-img-${trail.id}` : 'none', contain: 'paint' }}
      >
        <img
          src={image || trail.images[0]} alt={trail.name} loading="lazy" decoding="async"
          onError={e => { if (e.currentTarget.src !== trail.fallbacks[0]) e.currentTarget.src = trail.fallbacks[0]; }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-ink/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-sm font-medium text-white">{t('see_details')}</span>
        </div>
      </div>

      <div className="flex flex-col p-5 flex-grow">
        {children}
      </div>
    </Link>
  );
}

export function TrailCard({ trail, className = '' }) {
  const { t } = useTranslation();
  return (
    <TrailCardFrame trail={trail} className={className}>
      <h3 className="text-lg font-bold text-ink leading-snug mb-1 group-hover:text-brand transition-colors">
        {trail.name}
      </h3>
      <p className="flex items-center text-sm text-ink-muted mb-2">
        <MapPin size={14} className="mr-1.5 text-brand shrink-0" /><span className="truncate">{trail.location}</span>
      </p>
      <p className="text-sm line-clamp-2 text-ink-muted leading-relaxed mb-3 flex-grow">
        {trail.shortDescription}
      </p>

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-3">
        {/* duração e altitude ficam de fora quando ainda não foram levantadas */}
        <div className="flex items-center gap-4 text-sm font-medium text-ink min-w-0">
          {trail.time && <span className="flex items-center whitespace-nowrap"><Clock size={15} className="mr-1.5 text-brand" />{trail.time}</span>}
          {trail.altitude && <span className="flex items-center whitespace-nowrap"><TrendingUp size={15} className="mr-1.5 text-brand" />{trail.altitude}</span>}
        </div>
        <DifficultyBadge difficulty={trail.difficulty} className="uppercase tracking-wide" />
      </div>
    </TrailCardFrame>
  );
}
