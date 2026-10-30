import { api } from './api';

// Parties e convites, sempre no backend (respostas: PartyResponse, ConviteResponse, UsuarioResumo).
export function partyApi(token) {
  const call = (path, opts = {}) => api(path, { ...opts, token });
  return {
    mine: () => call('/parties/minhas'),
    get: id => call(`/parties/${id}`),
    create: body => call('/parties', { method: 'POST', body }),
    update: (id, body) => call(`/parties/${id}`, { method: 'PUT', body }),
    remove: id => call(`/parties/${id}`, { method: 'DELETE' }),
    leave: id => call(`/parties/${id}/sair`, { method: 'POST' }),
    invites: id => call(`/convites/party/${id}`),
    // who: { usuarioId } para amigos ou { email } para qualquer pessoa cadastrada
    invite: (partyId, who) => call('/convites', { method: 'POST', body: { partyId, ...who } }),
    received: () => call('/convites/recebidos'),
    accept: id => call(`/convites/${id}/aceitar`, { method: 'PATCH' }),
    decline: id => call(`/convites/${id}/recusar`, { method: 'PATCH' }),
    friends: userId => call(`/usuarios/${userId}/amigos`),
  };
}

// "2026-11-08" de hoje no fuso do navegador (toISOString usaria UTC e viraria o dia antes da meia-noite)
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "05:30:00" -> "05:30"
export const hhmm = s => (s ? s.slice(0, 5) : '');

// convida cada um; devolve quantos falharam (já convidado, bloqueio, e-mail sem cadastro…)
export async function sendInvites(p, partyId, { friendIds, emails }) {
  const results = await Promise.allSettled([
    ...friendIds.map(usuarioId => p.invite(partyId, { usuarioId })),
    ...emails.map(email => p.invite(partyId, { email })),
  ]);
  return results.filter(r => r.status === 'rejected').length;
}
