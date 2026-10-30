import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, TrendingUp, Calendar, ChevronLeft, Flag, Info, ChevronRight, FileText, Ruler, Heart, Map, Ticket, Route, Trees, Wrench, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { zoneKey } from '../utils/trailFormat';
import { api } from '../utils/api';
import { Layout } from '../components/Layout';
import { ReviewsSection } from '../components/ReviewsSection';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { useAuth } from '../context/AuthContext';
import { useTrails, TrailsError } from '../context/TrailsContext';
import { takeCard, flyToHero } from '../utils/cardToHero';

export function TrailDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { status, trailById } = useTrails();
  const trail = trailById(id);
  const { isLoggedIn, likedTrails, toggleLike } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dangers, setDangers] = useState([]);

  const heroRef = useRef(null);

  // ao trocar de trilha (o topo da página fica por conta do Layout)
  useLayoutEffect(() => { setMapLoaded(false); setCurrentImageIndex(0); }, [id]);

  // veio do clique num card, num navegador sem View Transitions: a foto do card cresce até aqui (utils/cardToHero)
  useLayoutEffect(() => {
    const from = trail && takeCard(trail.id);
    if (from && heroRef.current) flyToHero(from, heroRef.current);
  }, [trail]);

  // avisos de perigo ainda não resolvidos, enviados pela comunidade
  useEffect(() => {
    let alive = true;
    setDangers([]);
    api(`/avisos/trilha/${id}`).then(r => alive && setDangers(r)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  if (status !== 'ready' || !trail) {
    return (
      <Layout>
        <div className="container mx-auto px-4 pt-32 pb-20">
          {status === 'loading' ? <div className="map-skeleton h-[540px] rounded-3xl" aria-hidden="true" />
            : status === 'error' ? <TrailsError />
            : (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-ink">{t('not_found')}</h2>
                <Link to="/trilhas" className="text-brand hover:underline mt-4 inline-block">{t('back_to_list')}</Link>
              </div>
            )}
        </div>
      </Layout>
    );
  }

  const isLiked = likedTrails.includes(trail.id);
  const onLike = () => (isLoggedIn ? toggleLike(trail.id) : navigate('/login', { state: { from: `/trilhas/${trail.id}` } }));
  const feeLabel = trail.fee > 0 ? `R$ ${trail.fee.toFixed(2).replace('.', ',')}` : t('free');
  const mapUrl = `https://maps.google.com/maps?q=${trail.lat},${trail.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const total = trail.images.length;
  const credit = trail.credits[currentImageIndex];
  const hours = trail.opensAt
    ? (trail.closesAt ? t('hours_range', { from: trail.opensAt, to: trail.closesAt }) : t('hours_from', { from: trail.opensAt }))
    : t('open_24h');
  // a observação (ex.: "Entrada das 6h às 17h; saída até 18h.") só existe em português no banco
  const scheduleText = i18n.language.startsWith('pt') && trail.schedule ? trail.schedule : hours;

  // duração, altitude e extensão ficam de fora quando ainda não foram levantadas
  const stats = [
    { icon: Clock, label: t('time'), value: trail.time },
    { icon: TrendingUp, label: t('altitude'), value: trail.altitude },
    { icon: Ruler, label: t('length'), value: trail.length },
    { icon: Route, label: t('route_type'), value: t(trail.routeType) },
    { icon: Info, label: t('activity_type'), value: t(trail.activityType) },
    { icon: Map, label: t('zone'), value: t(zoneKey(trail.zone)) },
    { icon: Ticket, label: t('fee'), value: feeLabel, valueClass: trail.fee > 0 ? '' : 'text-trail-easy' },
  ].filter(s => s.value);

  return (
    <Layout>
      <div className="bg-base min-h-screen pt-28 pb-10">
        <div className="container mx-auto px-4">
          {/* Botão voltar — canto superior esquerdo */}
          <Link
            to="/trilhas" viewTransition
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface pl-2 pr-4 py-2 text-sm font-semibold text-ink-muted hover:text-brand hover:border-brand mb-6 transition shadow-sm"
          >
            <ChevronLeft size={20} /><span>{t('back_to_list')}</span>
          </Link>

          <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Carrossel — recebe a imagem do card via view transition */}
              <div ref={heroRef} className="lg:w-1/2 h-[340px] sm:h-[440px] lg:h-[540px] relative group bg-surface-2" style={{ viewTransitionName: `trail-img-${trail.id}`, contain: 'paint' }}>
                <img
                  key={currentImageIndex} src={trail.images[currentImageIndex]} alt={trail.name} className="w-full h-full object-cover"
                  onError={e => { const fb = trail.fallbacks[currentImageIndex]; if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }}
                />
                {credit && (
                  <a href={credit} target="_blank" rel="noreferrer" className="absolute top-3 right-3 rounded-lg bg-black/45 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white/85 hover:text-white">
                    Foto: Wikimedia Commons
                  </a>
                )}
                {total > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex(p => (p - 1 + total) % total)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Anterior"><ChevronLeft size={24} /></button>
                    <button onClick={() => setCurrentImageIndex(p => (p + 1) % total)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Próxima"><ChevronRight size={24} /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {trail.images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImageIndex(idx)} aria-label={`Foto ${idx + 1}`} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Informações */}
              <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                <div className="mb-6">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <DifficultyBadge difficulty={trail.difficulty} className="text-sm" />
                      {trail.maintenance && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-trail-moderate/15 px-3 py-1 text-xs font-bold text-trail-moderate ring-1 ring-trail-moderate/30">
                          <Wrench size={12} />{t('status_maintenance')}
                        </span>
                      )}
                    </div>
                    <button onClick={onLike} className="p-3 rounded-full bg-surface border border-border shadow-sm hover:scale-110 transition group" title={isLiked ? t('unlike') : t('like')} aria-pressed={isLiked}>
                      <Heart size={24} className={`${isLiked ? 'fill-trail-hard text-trail-hard' : 'text-ink-muted group-hover:text-trail-hard'} transition-colors`} />
                    </button>
                  </div>
                  <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink mb-3 tracking-tight leading-[1.05]">{trail.name}</h1>
                  <div className="flex items-center text-ink-muted">
                    <MapPin size={18} className="mr-2 text-brand shrink-0" /><span className="text-lg">{trail.location}</span>
                  </div>
                  {trail.park && (
                    <div className="mt-1 flex items-center text-sm text-ink-muted">
                      <Trees size={16} className="mr-2 text-brand shrink-0" /><span>{trail.park}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {stats.map(({ icon: Ic, label, value, valueClass = '' }) => (
                    <div key={label} className="bg-surface-2 p-4 rounded-xl">
                      <div className="flex items-center text-ink-muted mb-1"><Ic size={16} className="mr-2 text-brand" /><span className="text-xs uppercase tracking-wider">{label}</span></div>
                      <p className={`font-semibold text-ink ${valueClass}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 text-ink-muted">
                  {trail.howToGetThere && (
                    <div className="flex items-start"><Info size={20} className="mr-3 text-brand mt-1 shrink-0" /><div><h4 className="font-bold text-ink text-sm">{t('how_to_get_there')}</h4><p className="text-sm">{trail.howToGetThere}</p></div></div>
                  )}
                  <div className="flex items-start">
                    <Calendar size={20} className="mr-3 text-brand mt-1 shrink-0" />
                    <div>
                      <h4 className="font-bold text-ink text-sm">{t('schedule')}</h4>
                      <p className="text-sm">{scheduleText}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Avisos de perigo da comunidade */}
            {dangers.length > 0 && (
              <div className="p-8 border-t border-border bg-trail-hard/5">
                <h3 className="text-xl font-bold text-ink mb-4 flex items-center"><ShieldAlert size={20} className="mr-2 text-trail-hard" />{t('dangers_title')}</h3>
                <ul className="space-y-3">
                  {dangers.map(d => (
                    <li key={d.id} className="rounded-xl border border-trail-hard/30 bg-surface p-4 text-sm">
                      <p className="text-ink">{d.mensagem}</p>
                      <p className="mt-1 text-xs text-ink-muted">{d.autor?.nome} · {new Date(d.criadoEm).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Descrição */}
            <div className="p-8 border-t border-border">
              <h3 className="text-xl font-bold text-ink mb-4 flex items-center"><FileText size={20} className="mr-2 text-brand" />{t('about_trail')}</h3>
              <p className="font-editorial text-base md:text-lg text-brand tracking-wide leading-relaxed mb-4">{trail.shortDescription}</p>
              {trail.description && <p className="text-ink-muted leading-relaxed text-lg">{trail.description}</p>}
            </div>

            {/* Mapa — pela coordenada da trilha */}
            <div className="p-8 border-t border-border">
              <h3 className="text-xl font-bold text-ink mb-4 flex items-center"><Flag size={20} className="mr-2 text-brand" />{t('map_title')}</h3>
              <div className="w-full h-96 rounded-xl overflow-hidden shadow-sm relative">
                {!mapLoaded && (
                  <div className="absolute inset-0 z-10 map-skeleton rounded-xl flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
                      <span className="text-sm text-ink-muted font-medium">{t('loading_map')}</span>
                    </div>
                  </div>
                )}
                <iframe width="100%" height="100%" src={mapUrl} title="Google Maps" className={`border-0 transition-opacity duration-500 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`} loading="lazy" allowFullScreen onLoad={() => setMapLoaded(true)} />
              </div>
            </div>

            {/* Avaliações */}
            <div className="p-8 border-t border-border bg-surface-2/30">
              <ReviewsSection key={trail.id} trailId={trail.id} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
