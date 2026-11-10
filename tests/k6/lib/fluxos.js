// Fluxos de uso da API do Ecoturismo, reaproveitados por todos os tipos de teste.
// Só fazem leituras (e login), para não sujar o banco com curtidas, visitas ou parties.

import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
import { BASE_URL, USUARIO, JSON_HEADERS, BUSCAS, DIFICULDADES, ZONAS, DURACOES, sortear } from './config.js';

// A tag "name" agrupa as URLs com id no relatório (senão cada /api/trilhas/7, /api/trilhas/8... vira uma linha).
function get(url, nome, params = {}) {
  return http.get(`${BASE_URL}${url}`, { ...params, tags: { name: nome, ...(params.tags || {}) } });
}

function autenticado(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export function login(email = USUARIO.email, senha = USUARIO.senha) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, senha }), {
    headers: JSON_HEADERS,
    tags: { name: 'POST /api/auth/login' },
  });
  const ok = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: devolveu token': (r) => !!r.json('token'),
  });
  return ok ? res.json('token') : null;
}

/**
 * Roda uma vez antes do teste: confere se a API está de pé, faz login e pega os ids das trilhas.
 * O token é compartilhado por todos os usuários virtuais (o login usa BCrypt, que é caro de propósito;
 * o custo do login é medido à parte, no cenário "login").
 */
export function preparar() {
  const lista = get('/api/trilhas', 'GET /api/trilhas');
  if (lista.status !== 200) {
    fail(`A API não respondeu em ${BASE_URL}/api/trilhas (status ${lista.status}). O backend está rodando?`);
  }
  const ids = lista.json().map((t) => t.id);
  if (ids.length === 0) fail('Nenhuma trilha no banco: o Flyway rodou a V2__trilhas.sql?');

  const token = login();
  if (!token) {
    fail(`Não consegui logar com ${USUARIO.email}. Confira K6_EMAIL/K6_SENHA ou se as contas de teste foram criadas.`);
  }
  return { token, ids };
}

/** Visitante sem login: home, catálogo com filtros e detalhes de uma trilha. */
export function navegarCatalogo(dados) {
  group('visitante', () => {
    const home = get('/api/trilhas/destaques', 'GET /api/trilhas/destaques');
    check(home, { 'destaques: status 200': (r) => r.status === 200 });
    sleep(1);

    const params = [`q=${sortear(BUSCAS)}`];
    if (Math.random() < 0.5) params.push(`dificuldade=${sortear(DIFICULDADES)}`);
    if (Math.random() < 0.5) params.push(`zona=${sortear(ZONAS)}`);
    if (Math.random() < 0.3) params.push(`duracao=${sortear(DURACOES)}`);
    const busca = get(`/api/trilhas?${params.join('&')}`, 'GET /api/trilhas?filtros');
    check(busca, { 'busca: status 200': (r) => r.status === 200 });
    sleep(1);

    const id = sortear(dados.ids);
    const responses = http.batch([
      ['GET', `${BASE_URL}/api/trilhas/${id}`, null, { tags: { name: 'GET /api/trilhas/{id}' } }],
      ['GET', `${BASE_URL}/api/trilhas/${id}/avaliacoes`, null, { tags: { name: 'GET /api/trilhas/{id}/avaliacoes' } }],
      ['GET', `${BASE_URL}/api/trilhas/${id}/fotos`, null, { tags: { name: 'GET /api/trilhas/{id}/fotos' } }],
      ['GET', `${BASE_URL}/api/avisos/trilha/${id}`, null, { tags: { name: 'GET /api/avisos/trilha/{id}' } }],
    ]);
    check(responses[0], { 'detalhe: status 200': (r) => r.status === 200 });
    check(responses[1], { 'avaliações: status 200': (r) => r.status === 200 });
    check(responses[2], { 'fotos: status 200': (r) => r.status === 200 });
    check(responses[3], { 'avisos: status 200': (r) => r.status === 200 });
    sleep(2);
  });
}

/** Usuário logado: perfil, feed dos amigos e visitas. */
export function usarLogado(dados) {
  group('logado', () => {
    const auth = autenticado(dados.token);

    const me = get('/api/usuarios/me', 'GET /api/usuarios/me', auth);
    check(me, { 'me: status 200': (r) => r.status === 200 });
    sleep(1);

    const feed = get('/api/feed?pagina=0&tamanho=20', 'GET /api/feed', auth);
    check(feed, { 'feed: status 200': (r) => r.status === 200 });
    sleep(1);

    const visitas = get('/api/visitas/minhas', 'GET /api/visitas/minhas', auth);
    check(visitas, { 'visitas: status 200': (r) => r.status === 200 });
    sleep(2);
  });
}

/** Só o login, para medir quanto o BCrypt pesa sob carga. */
export function fazerLogin() {
  login();
  sleep(1);
}
