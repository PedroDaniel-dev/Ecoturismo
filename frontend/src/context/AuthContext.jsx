import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { avatarFor } from '../utils/trailArt';

const AuthContext = createContext(null);

// Converte o usuário do backend (UsuarioResponse) para o formato usado no frontend.
export const userFromApi = u => ({
  id: u.id,
  name: u.nome,
  email: u.email,
  avatar: u.fotoUrl || avatarFor(u.nome),
  bio: u.bio || '',
  birthDate: u.dataNascimento,
  phone: u.telefone || '',
  memberSince: u.criadoEm,
});

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
};

// Tudo passa pelo backend: sem ele não há login (nem catálogo). Curtidas ficam no banco (tabela CURTIDA).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('auth_user', null));
  const [token, setToken] = useState(() => load('auth_token', null));
  const [likedTrails, setLikedTrails] = useState(() => load('liked_trails', []));

  useEffect(() => save('auth_user', user), [user]);
  useEffect(() => save('auth_token', token), [token]);
  useEffect(() => save('liked_trails', likedTrails), [likedTrails]);

  const apply = (u, newToken) => {
    setUser(userFromApi(u));
    setLikedTrails([...u.trilhasCurtidas]);
    if (newToken) setToken(newToken);
  };

  const logout = useCallback(() => { setUser(null); setToken(null); setLikedTrails([]); }, []);

  // Ao abrir o site, atualiza os dados da conta. Token recusado (expirou ou a senha mudou em outro lugar) = sai da conta.
  useEffect(() => {
    if (!token) return;
    api('/usuarios/me', { token })
      .then(u => apply(u))
      .catch(e => { if (e.status === 401 || e.status === 403) logout(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, senha) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, senha } });
    apply(data.usuario, data.token);
  };

  const register = async (nome, email, senha, dataNascimento) => {
    const data = await api('/auth/register', { method: 'POST', body: { nome, email, senha, dataNascimento } });
    apply(data.usuario, data.token);
  };

  // Atualiza os dados do usuário logado depois de editar o perfil (nome, bio, foto).
  const updateUser = patch => setUser(u => (u ? { ...u, ...patch } : u));

  // Otimista: a tela muda na hora e volta atrás se o backend recusar.
  const toggleLike = async id => {
    setLikedTrails(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
    try {
      const r = await api(`/trilhas/${id}/curtir`, { method: 'POST', token });
      setLikedTrails(list => (r.curtida ? [...new Set([...list, id])] : list.filter(x => x !== id)));
    } catch (e) {
      setLikedTrails(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
      if (e.status === 401) logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn: !!user && !!token, login, register, logout, updateUser, likedTrails, toggleLike }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
