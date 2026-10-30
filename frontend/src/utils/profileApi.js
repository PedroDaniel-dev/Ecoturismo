import { api } from './api';

// Operações da tela de perfil, sempre no backend (respostas: PerfilResponse, VisitaResponse, FotoTrilhaResponse, UsuarioResumo).
export function profileApi(token) {
  const call = (path, opts = {}) => api(path, { ...opts, token });
  return {
    profile: id => call(`/usuarios/${id}/perfil`),
    // o id da aba é o mesmo trecho da rota: avaliacoes, visitas, fotos, amigos
    tab: (id, tab) => call(`/usuarios/${id}/${tab}`),
    followers: id => call(`/usuarios/${id}/seguidores`),
    following: id => call(`/usuarios/${id}/seguindo`),
    follow: id => call(`/usuarios/${id}/seguir`, { method: 'POST' }),
    unfollow: id => call(`/usuarios/${id}/seguir`, { method: 'DELETE' }),
    block: id => call(`/usuarios/${id}/bloquear`, { method: 'POST' }),
    unblock: id => call(`/usuarios/${id}/bloquear`, { method: 'DELETE' }),
    report: (id, motivo, descricao) => call(`/usuarios/${id}/denunciar`, { method: 'POST', body: { motivo, descricao } }),
    updateMe: ({ nome, bio }) => call('/usuarios/me', { method: 'PUT', body: { nome, bio } }),
    uploadAvatar: file => call('/usuarios/me/foto', { method: 'POST', body: form({ arquivo: file }) }),
    removeAvatar: () => call('/usuarios/me/foto', { method: 'DELETE' }),
    uploadPhoto: (trilhaId, file, legenda) => call(`/trilhas/${trilhaId}/fotos`, { method: 'POST', body: form({ arquivo: file, legenda }) }),
  };
}

const form = fields => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') f.append(k, v); });
  return f;
};
