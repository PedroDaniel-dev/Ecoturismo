// Animação "foto do card cresce até a foto da página da trilha" para navegadores sem View Transitions
// (ex.: Firefox até a versão 143). Onde há suporte, quem anima é o próprio navegador, pelo view-transition-name
// que o card e a página da trilha compartilham; aqui não se faz nada.

let pending = null;

const supported = () => typeof document !== 'undefined' && 'startViewTransition' in document;

// No clique do card: guarda onde a foto estava na tela.
export function rememberCard(id, frame) {
  if (supported() || !frame) return;
  const img = frame.querySelector('img');
  const r = frame.getBoundingClientRect();
  pending = { id, src: img?.currentSrc || img?.src, rect: { top: r.top, left: r.left, width: r.width, height: r.height }, at: Date.now() };
}

// Na página da trilha: devolve a posição guardada, se o clique foi agora há pouco e nesta trilha.
export function takeCard(id) {
  const p = pending;
  pending = null;
  return p && p.src && p.id === id && Date.now() - p.at < 3000 ? p : null;
}

// Uma cópia da foto voa da posição do card até a foto grande; a foto de verdade fica invisível até acabar.
export function flyToHero(from, target) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  target.style.opacity = '0';
  // espera um quadro: o Layout leva a página ao topo depois que esta página monta
  requestAnimationFrame(() => {
    const to = target.getBoundingClientRect();
    const ghost = document.createElement('img');
    ghost.src = from.src;
    ghost.alt = '';
    Object.assign(ghost.style, {
      position: 'fixed', top: '0', left: '0', zIndex: '40', margin: '0', objectFit: 'cover', pointerEvents: 'none',
    });
    document.body.appendChild(ghost);
    const frame = (r, radius) => ({
      width: `${r.width}px`, height: `${r.height}px`, transform: `translate(${r.left}px, ${r.top}px)`, borderRadius: radius,
    });
    // mesma duração e curva das View Transitions (index.css)
    const anim = ghost.animate([frame(from.rect, '12px'), frame(to, '0px')], {
      duration: 550, easing: 'cubic-bezier(.22, .8, .2, 1)', fill: 'forwards',
    });
    const done = () => { target.style.opacity = ''; ghost.remove(); };
    anim.onfinish = done;
    anim.oncancel = done;
  });
}
