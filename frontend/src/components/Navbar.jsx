import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, ChevronDown, Check, LogIn, LogOut, Heart, Menu, X, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useInvites } from '../context/InvitesContext';
import { useTrails } from '../context/TrailsContext';
import { InviteCard } from './party/PartyCards';
import { LANGUAGES } from '../i18n';
import { Flag } from './Flag';

function useClickOutside(ref, onOut) {
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 hover:bg-surface-2/70 transition"
        aria-label={t('language')} aria-expanded={open}
      >
        <Flag code={current.code} />
        <ChevronDown size={14} className={`text-ink-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="absolute right-0 mt-3 w-48 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl p-1.5 animate-rise" style={{ animationDuration: '.25s' }}>
          {LANGUAGES.map(l => (
            <li key={l.code}>
              <button
                onClick={() => { i18n.changeLanguage(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-surface-2 ${l.code === current.code ? 'text-brand font-semibold' : 'text-ink'}`}
              >
                <Flag code={l.code} />
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === current.code && <Check size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UserButton() {
  const { t } = useTranslation();
  const { user, isLoggedIn, logout, likedTrails } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  if (!isLoggedIn) {
    return (
      <Link to="/login" className="ml-1 inline-flex items-center gap-2 rounded-xl bg-brand text-brand-ink px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition">
        <LogIn size={16} /> <span className="hidden sm:inline">{t('login')}</span>
      </Link>
    );
  }

  return (
    <div className="relative ml-1" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="block rounded-full ring-2 ring-brand/70 hover:ring-brand transition" aria-label={user.name}>
        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl p-2 animate-rise" style={{ animationDuration: '.25s' }}>
          <Link to="/perfil" onClick={() => setOpen(false)} title={t('my_profile')} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-2 transition">
            <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate">{user.name}</p>
              <p className="text-xs text-ink-muted truncate">{t('my_profile')}</p>
            </div>
          </Link>
          <div className="my-1 border-t border-border" />
          <Link to="/trilhas?curtidas=1" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-surface-2">
            <Heart size={16} className="text-trail-hard" /> {t('my_likes')} <span className="ml-auto text-ink-muted">{likedTrails.length}</span>
          </Link>
          <button onClick={() => { logout(); setOpen(false); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-surface-2">
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

// Sino com os convites pendentes; dá para aceitar ou recusar sem sair da página
function InvitesBell() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { pending, respond, reload } = useInvites();
  const { trailById } = useTrails();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);

  if (!isLoggedIn) return null;

  const toggle = () => { if (!open) reload(); setOpen(o => !o); };
  const onRespond = async (id, accept) => {
    setBusyId(id);
    try { await respond(id, accept); } catch (e) { /* continua pendente */ }
    setBusyId(null);
  };

  // no celular o menu se alinha à navbar (não ao sino), senão vazaria pela esquerda da tela
  return (
    <div className="sm:relative" ref={ref}>
      <button
        onClick={toggle} aria-expanded={open}
        aria-label={t('invites_aria', { count: pending.length })} title={t('invites_title')}
        className="relative p-2.5 rounded-xl text-ink hover:bg-surface-2/70 hover:text-brand transition"
      >
        <Bell size={18} />
        {pending.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.125rem] rounded-full bg-trail-hard px-1 text-center text-[10px] font-bold leading-[1.125rem] text-white">{pending.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-4 sm:right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl p-3 animate-rise" style={{ animationDuration: '.25s' }}>
          <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">{t('invites_title')}</p>
          {pending.length === 0 ? (
            <p className="px-1 py-3 text-sm text-ink-muted">{t('invites_empty')}</p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {pending.slice(0, 4).map(c => (
                <InviteCard key={c.id} invite={c} trail={trailById(c.party.trilhaId)} onRespond={onRespond} busy={busyId === c.id} compact />
              ))}
            </div>
          )}
          <Link to="/parties?aba=convites" className="mt-2 block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-brand hover:bg-surface-2">
            {t('invites_see_all')}
          </Link>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const linkCls = ({ isActive }) =>
    `px-4 py-2.5 rounded-xl text-sm font-semibold transition ${isActive ? 'bg-brand/15 text-brand' : 'text-ink hover:text-brand'}`;

  return (
    <header className="fixed top-4 inset-x-0 z-50 px-4" style={{ viewTransitionName: 'site-nav' }}>
      <nav className="mx-auto max-w-6xl min-h-[4.25rem] flex items-center gap-2 rounded-[1.375rem] border border-white/20 dark:border-white/10 bg-[rgb(var(--nav-bg)/0.62)] backdrop-blur-xl backdrop-saturate-150 shadow-lg shadow-black/5 pl-6 pr-3 py-3">
        <button onClick={() => navigate('/')} className="font-display text-base sm:text-lg font-extrabold whitespace-nowrap tracking-[0.14em] text-ink leading-none mr-auto">
          ECOTURISMO <span className="text-brand">RIO</span>
        </button>

        <div className="hidden lg:flex items-center gap-1">
          <NavLink to="/" end className={linkCls}>{t('home')}</NavLink>
          <NavLink to="/trilhas" viewTransition className={linkCls}>{t('trails')}</NavLink>
          <NavLink to="/parties" className={linkCls}>{t('nav_parties')}</NavLink>
          <NavLink to="/avisos" className={linkCls}>{t('nav_dangers')}</NavLink>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-ink hover:bg-surface-2/70 hover:text-brand transition"
          aria-label={theme === 'dark' ? t('theme_light') : t('theme_dark')}
          title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <LanguageSelect />
        <InvitesBell />
        <UserButton />

        <button className="lg:hidden p-2.5 rounded-xl text-ink hover:bg-surface-2/70" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <SideMenu open={mobileOpen} onClose={() => setMobileOpen(false)} linkCls={linkCls} />
    </header>
  );
}

// Barra lateral do menu. Vai para o <body> via portal porque o backdrop-blur da nav
// faria o `position: fixed` ficar preso dentro dela.
function SideMenu({ open, onClose, linkCls }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  return createPortal(
    <div className={`lg:hidden fixed inset-0 z-[60] transition-[visibility] duration-300 ${open ? 'visible' : 'invisible'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        role="dialog" aria-modal="true" aria-label="Menu"
        className={`absolute inset-y-0 right-0 w-72 max-w-[85vw] flex flex-col gap-1 border-l border-border bg-surface shadow-2xl p-4 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-4 pl-2">
          <span className="font-display text-base font-extrabold tracking-[0.14em] text-ink">
            ECOTURISMO <span className="text-brand">RIO</span>
          </span>
          <button onClick={onClose} className="p-2.5 rounded-xl text-ink hover:bg-surface-2/70" aria-label={t('close', 'Fechar')}>
            <X size={18} />
          </button>
        </div>
        <NavLink to="/" end onClick={onClose} className={linkCls}>{t('home')}</NavLink>
        <NavLink to="/trilhas" onClick={onClose} className={linkCls}>{t('trails')}</NavLink>
        <NavLink to="/parties" onClick={onClose} className={linkCls}>{t('nav_parties')}</NavLink>
        <NavLink to="/avisos" onClick={onClose} className={linkCls}>{t('nav_dangers')}</NavLink>
      </aside>
    </div>,
    document.body
  );
}
