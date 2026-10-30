import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ban, CalendarDays, Check, Flag, ImagePlus, MoreHorizontal, Pencil, UserCheck, UserPlus } from 'lucide-react';
import { Layout } from '../components/Layout';
import { TrailCard } from '../components/TrailCard';
import { ReviewCard, VisitCard, PhotoCard, PersonCard, parseDate } from '../components/profile/ProfileCards';
import { EditProfileDialog, BlockDialog, ReportDialog, AddPhotoDialog, PeopleDialog } from '../components/profile/ProfileDialogs';
import { useAuth } from '../context/AuthContext';
import { useTrails } from '../context/TrailsContext';
import { avatarFor } from '../utils/trailArt';
import { profileApi } from '../utils/profileApi';

// abas: o id é o mesmo trecho da rota do backend (/api/usuarios/{id}/avaliacoes …) e vai na URL (?aba=).
// Curtidas só aparece no próprio perfil e vem do AuthContext, sem chamar o backend.
const TABS = [
  { id: 'avaliacoes', label: 'tab_reviews' },
  { id: 'visitas', label: 'tab_visits' },
  { id: 'fotos', label: 'tab_photos' },
  { id: 'amigos', label: 'tab_friends' },
  { id: 'curtidas', label: 'tab_likes', mine: true },
];

// open: o que acontece ao clicar no número (abrir a lista ou ir para a aba)
const STATS = [
  { key: 'avaliacoes', label: 'stat_reviews' },
  { key: 'visitas', label: 'stat_visits' },
  { key: 'partiesOrganizadas', label: 'stat_parties' },
  { key: 'seguidores', label: 'stat_followers', open: { dialog: 'followers' } },
  { key: 'seguindo', label: 'stat_following', open: { dialog: 'following' } },
  { key: 'amigos', label: 'stat_friends', open: { tab: 'amigos' } },
];


// "Jan/24": mês abreviado no idioma atual + ano com dois dígitos
const memberSince = (iso, lang) => {
  const d = parseDate(iso);
  const month = d.toLocaleDateString(lang, { month: 'short' }).replace('.', '');
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${String(d.getFullYear()).slice(2)}`;
};

export function Profile() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <ProfilePage />;
}

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { id: param } = useParams();
  const { user, token, updateUser, likedTrails } = useAuth();
  const [params, setParams] = useSearchParams();

  const { trailById } = useTrails();
  const meId = user.id;
  const id = param ? Number(param) : meId;
  const tabs = TABS.filter(x => !x.mine || id === meId);
  const tab = tabs.some(x => x.id === params.get('aba')) ? params.get('aba') : 'avaliacoes';
  // não depende de `user`: depois de editar o perfil a tela atualiza o próprio estado, sem recarregar tudo
  const p = useMemo(() => profileApi(token), [token]);

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | not_found | error
  const [items, setItems] = useState(null);
  const [dialog, setDialog] = useState(null); // edit | block | report | photo | followers | following
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    p.profile(id)
      .then(r => { if (alive) { setProfile(r); setStatus('ready'); } })
      .catch(e => { if (alive) setStatus(e.status === 404 ? 'not_found' : 'error'); });
    return () => { alive = false; };
  }, [p, id]);

  useEffect(() => setDialog(null), [id]);

  const blocked = !!profile?.euBloqueei;
  useEffect(() => {
    if (status !== 'ready' || blocked || tab === 'curtidas') return;
    let alive = true;
    setItems(null);
    p.tab(id, tab).then(r => alive && setItems(r)).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [p, id, tab, status, blocked]);

  const loadFollowers = useCallback(() => p.followers(id), [p, id]);
  const loadFollowing = useCallback(() => p.following(id), [p, id]);
  const closeDialog = useCallback(() => setDialog(null), []);

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const r = profile.euSigo ? await p.unfollow(id) : await p.follow(id);
      // seguir de volta cria a amizade; deixar de seguir um amigo desfaz
      const wasFriend = profile.euSigo && profile.meSegue;
      setProfile(pr => ({ ...pr, euSigo: r.seguindo, seguidores: r.seguidores, amigos: pr.amigos + (r.amigos ? 1 : 0) - (wasFriend ? 1 : 0) }));
      if (tab === 'amigos' && r.amigos !== wasFriend) setItems(await p.tab(id, 'amigos'));
    } catch (e) { /* o botão continua no estado anterior */ }
    setBusy(false);
  };

  const block = async () => {
    await p.block(id);
    setProfile(pr => ({
      ...pr, euBloqueei: true, euSigo: false, meSegue: false,
      seguidores: pr.euSigo ? pr.seguidores - 1 : pr.seguidores,
      seguindo: pr.meSegue ? pr.seguindo - 1 : pr.seguindo,
      amigos: pr.euSigo && pr.meSegue ? pr.amigos - 1 : pr.amigos,
    }));
    setDialog(null);
  };

  const unblock = async () => {
    await p.unblock(id);
    setProfile(pr => ({ ...pr, euBloqueei: false }));
  };

  const saved = patch => {
    const nome = patch.nome ?? profile.nome;
    const bio = patch.bio ?? '';
    const fotoUrl = 'fotoUrl' in patch ? patch.fotoUrl : profile.fotoUrl;
    updateUser({ name: nome, bio, avatar: fotoUrl || avatarFor(nome) });
    setProfile(pr => ({ ...pr, nome, bio, fotoUrl }));
    setDialog(null);
  };

  const photoAdded = async (trilhaId, file, legenda) => {
    const photo = await p.uploadPhoto(trilhaId, file, legenda);
    setProfile(pr => ({ ...pr, fotos: pr.fotos + 1 }));
    if (tab === 'fotos') setItems(list => [photo, ...(list || [])]);
    else setParams({ aba: 'fotos' });
    setDialog(null);
  };

  if (status === 'loading') return <Layout><ProfileSkeleton /></Layout>;
  if (status !== 'ready') {
    return (
      <Layout>
        <div className="pt-40 pb-24 container mx-auto px-4 text-center">
          <p className="text-lg text-ink-muted">{t(status === 'not_found' ? 'profile_not_found' : 'profile_error')}</p>
          <Link to="/" className="btn-ghost mt-6">{t('back')}</Link>
        </div>
      </Layout>
    );
  }

  const me = profile.souEu;
  const friends = profile.euSigo && profile.meSegue;
  const avatar = profile.fotoUrl || avatarFor(profile.nome);
  const liked = likedTrails.map(trailById).filter(Boolean);
  const list = tab === 'curtidas' ? liked : items;

  return (
    <Layout>
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* ── cabeçalho ── */}
          <header className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
            <img src={avatar} alt={profile.nome} className="w-28 h-28 md:w-36 md:h-36 shrink-0 rounded-full object-cover ring-4 ring-brand/30 shadow-lg" />

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-tight break-words">{profile.nome}</h1>
              {profile.bio && <p className="mt-3 max-w-2xl text-lg text-ink-muted leading-relaxed">{profile.bio}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
                  <CalendarDays size={16} className="text-brand" />
                  {t('member_since', { date: memberSince(profile.membroDesde, i18n.language) })}
                </span>
                {!me && !blocked && profile.meSegue && !friends && (
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t('follows_you')}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {me ? (
                <button onClick={() => setDialog('edit')} className="btn-ghost"><Pencil size={16} />{t('edit_profile')}</button>
              ) : (
                <>
                  {!blocked && (
                    profile.euSigo ? (
                      <button onClick={toggleFollow} disabled={busy} className="group btn-ghost border-brand text-brand min-w-[9.5rem] hover:border-trail-hard hover:text-trail-hard">
                        {friends ? <UserCheck size={16} className="group-hover:hidden" /> : <Check size={16} className="group-hover:hidden" />}
                        <span className="group-hover:hidden">{t(friends ? 'friends' : 'following')}</span>
                        <span className="hidden group-hover:inline">{t('unfollow')}</span>
                      </button>
                    ) : (
                      <button onClick={toggleFollow} disabled={busy} className="btn-primary min-w-[9.5rem]">
                        <UserPlus size={16} />{t(profile.meSegue ? 'follow_back' : 'follow')}
                      </button>
                    )
                  )}
                  <MoreMenu blocked={blocked} onBlock={() => setDialog('block')} onUnblock={unblock} onReport={() => setDialog('report')} />
                </>
              )}
            </div>
          </header>

          {/* ── números: centralizados sobre o rótulo, fundo transparente, só uma linha embaixo ── */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-2 border-b border-border pb-6">
            {STATS.map(s => {
              const content = (
                <>
                  <span className="block font-display text-3xl md:text-4xl text-ink tabular-nums transition-colors group-hover:text-brand">{profile[s.key]}</span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">{t(s.label)}</span>
                </>
              );
              // seguidores/seguindo abrem a lista (que leva ao perfil de cada pessoa); amigos vai para a aba
              const open = () => (s.open.dialog ? setDialog(s.open.dialog) : setParams({ aba: s.open.tab }, { replace: true }));
              return s.open && !blocked ? (
                <button key={s.key} onClick={open} className="group rounded-xl px-3 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {content}
                </button>
              ) : (
                <div key={s.key} className="px-3 py-3 text-center">{content}</div>
              );
            })}
          </div>

          {/* ── abas ── */}
          <div className="mt-12 flex flex-wrap items-end justify-between gap-4 border-b border-border">
            <div role="tablist" className="flex gap-1 overflow-x-auto -mb-px">
              {tabs.map(x => (
                <button
                  key={x.id} role="tab" aria-selected={tab === x.id}
                  onClick={() => setParams({ aba: x.id }, { replace: true })}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === x.id ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'}`}
                >
                  {t(x.label)}
                </button>
              ))}
            </div>
            {me && tab === 'fotos' && (
              <button onClick={() => setDialog('photo')} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                <ImagePlus size={16} />{t('add_photo')}
              </button>
            )}
          </div>

          {/* ── conteúdo da aba (mesma grade do catálogo) ── */}
          {blocked ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
              <p className="text-ink-muted">{t('blocked_notice', { name: profile.nome })}</p>
              <button onClick={unblock} className="btn-ghost mt-5">{t('unblock')}</button>
            </div>
          ) : list === null ? (
            <CardsSkeleton />
          ) : list.length === 0 ? (
            <EmptyTab tab={tab} me={me} onAddPhoto={() => setDialog('photo')} />
          ) : tab === 'amigos' ? (
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {list.map(u => <PersonCard key={u.id} person={u} />)}
            </div>
          ) : tab === 'curtidas' ? (
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {list.map(tr => <TrailCard key={tr.id} trail={tr} />)}
            </div>
          ) : (
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {list.map(it => {
                const trail = trailById(it.trilhaId);
                if (!trail) return null;
                if (tab === 'avaliacoes') return <ReviewCard key={it.id} trail={trail} review={it} />;
                if (tab === 'visitas') return <VisitCard key={it.id} trail={trail} visit={it} />;
                return <PhotoCard key={it.id} trail={trail} photo={it} />;
              })}
            </div>
          )}
        </div>
      </div>

      {dialog === 'edit' && <EditProfileDialog profile={profile} api={p} onSaved={saved} onClose={closeDialog} />}
      {dialog === 'block' && <BlockDialog name={profile.nome} onConfirm={block} onClose={closeDialog} />}
      {dialog === 'report' && <ReportDialog name={profile.nome} onSubmit={(motivo, descricao) => p.report(id, motivo, descricao)} onClose={closeDialog} />}
      {dialog === 'photo' && <AddPhotoDialog onSubmit={photoAdded} onClose={closeDialog} />}
      {dialog === 'followers' && <PeopleDialog title={t('followers_title', { name: profile.nome })} empty={t('no_followers')} load={loadFollowers} onClose={closeDialog} />}
      {dialog === 'following' && <PeopleDialog title={t('following_title', { name: profile.nome })} empty={t('no_following')} load={loadFollowing} onClose={closeDialog} />}
    </Layout>
  );
}

function MoreMenu({ blocked, onBlock, onUnblock, onReport }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-surface-2';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)} aria-label={t('more_options')} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink hover:border-brand hover:text-brand transition"
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-xl p-1.5 animate-rise" style={{ animationDuration: '.2s' }}>
          <button role="menuitem" onClick={() => { setOpen(false); (blocked ? onUnblock : onBlock)(); }} className={`${item} text-ink`}>
            <Ban size={16} />{blocked ? t('unblock') : t('block')}
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); onReport(); }} className={`${item} text-trail-hard`}>
            <Flag size={16} />{t('report')}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyTab({ tab, me, onAddPhoto }) {
  const { t } = useTranslation();
  const text = {
    avaliacoes: me ? 'empty_reviews_me' : 'empty_reviews',
    visitas: 'empty_visits',
    fotos: me ? 'empty_photos_me' : 'empty_photos',
    amigos: me ? 'empty_friends_me' : 'empty_friends',
    curtidas: 'empty_likes_me',
  }[tab];
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-ink-muted">{t(text)}</p>
      {me && tab === 'fotos' && <button onClick={onAddPhoto} className="btn-ghost mt-5"><ImagePlus size={16} />{t('add_photo')}</button>}
      {me && tab !== 'fotos' && tab !== 'amigos' && <Link to="/trilhas" viewTransition className="btn-ghost mt-5">{t('hero_cta')}</Link>}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="map-skeleton h-0 pt-[calc(75%-20px)]" />
          <div className="space-y-3 p-5">
            <div className="map-skeleton h-5 w-2/3 rounded" />
            <div className="map-skeleton h-4 w-full rounded" />
            <div className="map-skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="pt-32 pb-20 container mx-auto px-4" aria-hidden="true">
      <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
        <div className="map-skeleton w-28 h-28 md:w-36 md:h-36 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="map-skeleton h-10 w-64 rounded" />
          <div className="map-skeleton h-5 w-full max-w-xl rounded" />
        </div>
      </div>
      <div className="map-skeleton mt-10 h-24 rounded-2xl" />
      <CardsSkeleton />
    </div>
  );
}
