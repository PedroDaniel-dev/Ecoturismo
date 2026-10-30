import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, MapPin, Sun, Wind } from 'lucide-react';
import { useRioWeather } from '../utils/useRioWeather';

/*
  Hero cinematográfico: foto aérea real do Rio + "RIO" gigante, em parallax.
  Cada camada lê --sy (scroll em px) e --mx/--my (mouse de -1 a 1), atualizadas pelo rAF abaixo —
  nada de setState por evento de scroll/mouse, então o React não re-renderiza enquanto anima.
  Ordem, de trás para frente: foto → tratamento de cor → "RIO" → sombra da base → barra editorial / subtítulo / indicador de scroll.
*/

const HERO_PHOTO = 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=2500&auto=format&fit=crop';

// mouse: --mx/--my vão de -1 a 1 (equivale a mousePos ±10 do projeto original, por isso os px abaixo = fator × 10)
const layer = (scroll, mouseX, mouseY = 0, extra = '') => ({
  transform: `translate3d(calc(var(--mx) * ${mouseX}px), calc(var(--sy) * ${scroll}px + var(--my) * ${mouseY}px), 0) ${extra}`,
  willChange: 'transform',
});
const fadeOut = dist => ({ opacity: `calc(1 - var(--sy) / ${dist})` });

const pill = 'flex items-center gap-3 rounded-full border border-white/10 bg-black/30 backdrop-blur-md px-4 py-2 shadow-lg';

export function Hero() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const weather = useRioWeather();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      el.style.setProperty('--mx', cur.x.toFixed(4));
      el.style.setProperty('--my', cur.y.toFixed(4));
      el.style.setProperty('--sy', Math.min(window.scrollY, window.innerHeight * 1.2).toFixed(1));
      if (Math.abs(target.x - cur.x) > 0.001 || Math.abs(target.y - cur.y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = e => {
      if (reduce) return;
      target = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      kick();
    };
    const onScroll = () => kick();

    el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0); el.style.setProperty('--sy', 0);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToAbout = () => document.getElementById('comecar')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section
      ref={ref}
      className="relative w-full h-[100svh] min-h-[750px] max-h-[1100px] overflow-hidden bg-hero-shade flex flex-col justify-between select-none"
      aria-label="Rio de Janeiro"
    >
      {/* Imagem aérea do Rio — sobe devagar, aproxima com o scroll e desliza contra o mouse */}
      <div className="absolute -inset-x-[2%] -top-[10%] h-[120%]" style={layer(0.15, -5, -5, 'scale(calc(1 + var(--sy) * 0.0004))')}>
        <div className="hero-photo absolute inset-0 bg-cover bg-center animate-hero-in" style={{ backgroundImage: `url('${HERO_PHOTO}')` }} />
      </div>

      {/* Tratamento cinematográfico */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/20 via-sky-900/30 to-hero-shade/95 mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-hero-shade via-hero-shade/60 to-transparent" />

      {/* Barra editorial (abaixo da navbar fixa) */}
      <div className="relative z-30 container mx-auto px-4 sm:px-6 pt-28 sm:pt-32 flex justify-between items-center text-white/80 text-xs sm:text-sm tracking-widest uppercase font-medium">
        <div className={pill}>
          <MapPin size={14} className="text-amber-400" /><span>Rio de Janeiro • 22°54'S 43°10'W</span>
        </div>
        {weather?.sunrise && (
          <div className={`hidden sm:flex ${pill} gap-6 px-5 animate-fade-in`}>
            <span className="flex items-center gap-2"><Sun size={14} className="text-amber-400 animate-pulse" />{t('sunrise')} {weather.sunrise}</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-2"><Wind size={14} className="text-sky-300" />{weather.wind} km/h {weather.dir}</span>
          </div>
        )}
      </div>

      {/* Tipografia gigante */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex w-full flex-col items-center justify-center px-4"
        style={{
          transform: 'translate3d(calc(var(--mx) * 8px), calc(var(--sy) * 0.38px - 100px + var(--my) * 8px), 0)',
          willChange: 'transform',
          ...fadeOut(650),
        }}
      >
        <span className="font-editorial mb-2 md:mb-4 text-center text-xs sm:text-sm md:text-base font-semibold uppercase tracking-[0.35em] text-amber-300/90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-rise">
          {t('hero_badge')}
        </span>
        <h1 className="font-display font-black text-[22vw] sm:text-[23vw] md:text-[24vw] leading-[0.78] tracking-[0.05em] text-white drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-rise" style={{ animationDelay: '.1s' }}>
          RIO
        </h1>
      </div>

      {/* Sombra da base: dá leitura ao subtítulo e emenda o hero com a página */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[48%] bg-gradient-to-t from-hero-shade via-hero-shade/90 to-transparent" />

      {/* Subtítulo + chamadas */}
      <div className="relative z-30 container mx-auto px-4 sm:px-6 pb-16 sm:pb-20 flex items-center justify-center md:justify-start" style={fadeOut(450)}>
        <div className="max-w-xl text-center md:text-left">
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed drop-shadow-md">{t('hero_subtitle')}</p>
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
            <Link to="/trilhas" viewTransition className="btn-primary">{t('hero_cta')} <ArrowRight size={18} /></Link>
            <a href="#comecar" className="btn-ghost border-white/25 text-white hover:border-amber-300 hover:text-amber-300">{t('hero_cta2')}</a>
          </div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <button onClick={scrollToAbout} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 p-2 text-white/60 hover:text-amber-400 transition-colors animate-bounce" aria-label={t('scroll')}>
        <ChevronDown size={28} />
      </button>
    </section>
  );
}
