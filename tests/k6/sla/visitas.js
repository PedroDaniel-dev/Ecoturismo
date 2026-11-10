// SLA – Serviço 2: Planejar e cancelar visita (INSERÇÃO + ATUALIZAÇÃO)
//   POST  /api/visitas               → insere uma linha em VISITA
//   PATCH /api/visitas/{id}/cancelar → atualiza o status da linha para CANCELADA
//
// Antes do teste, o setup cadastra um usuário por VU (POST /api/auth/register), para que cada VU escreva
// as próprias visitas. Cada iteração usa uma data diferente, porque o banco tem UNIQUE (idUsuario, idTrilha, data).
// ATENÇÃO: este teste grava no banco. Rode só em banco de teste (o workflow usa um MySQL descartável).
//
//   k6 run --out csv=sla-saida/visitas.csv.gz tests/k6/sla/visitas.js

import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL, JSON_HEADERS, MAX_VUS, cenarioEmDegraus, marcarDegrau, metas } from './lib/degraus.js';

export const options = {
  scenarios: { visitas: cenarioEmDegraus('planejarECancelar') },
  thresholds: metas(500),
  setupTimeout: '5m',
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const DATA_BASE = Date.UTC(2030, 0, 1);
const UM_DIA = 24 * 60 * 60 * 1000;

export function setup() {
  const lista = http.get(`${BASE_URL}/api/trilhas`);
  if (lista.status !== 200) fail(`API fora do ar em ${BASE_URL} (status ${lista.status})`);
  const trilhas = lista.json().map((t) => t.id);

  // cadastra MAX_VUS usuários, 20 de cada vez (o cadastro usa BCrypt e é lento)
  const execucao = Date.now();
  const tokens = [];
  for (let inicio = 0; inicio < MAX_VUS; inicio += 20) {
    const lote = [];
    for (let i = inicio; i < Math.min(inicio + 20, MAX_VUS); i++) {
      const corpo = JSON.stringify({
        nome: `Carga ${i + 1}`,
        email: `k6-${execucao}-${i + 1}@carga.test`,
        senha: 'senha-k6-1234',
        dataNascimento: '1995-06-15',
      });
      lote.push(['POST', `${BASE_URL}/api/auth/register`, corpo, { headers: JSON_HEADERS, tags: { name: 'setup: register' } }]);
    }
    for (const r of http.batch(lote)) {
      if (r.status !== 201) fail(`Cadastro de usuário de teste falhou (status ${r.status}): ${r.body}`);
      tokens.push(r.json('token'));
    }
  }
  return { trilhas, tokens };
}

export function planejarECancelar(dados) {
  marcarDegrau();
  const auth = { ...JSON_HEADERS, Authorization: `Bearer ${dados.tokens[(__VU - 1) % dados.tokens.length]}` };
  const trilhaId = dados.trilhas[Math.floor(Math.random() * dados.trilhas.length)];
  const data = new Date(DATA_BASE + __ITER * UM_DIA).toISOString().slice(0, 10);

  const criada = http.post(`${BASE_URL}/api/visitas`, JSON.stringify({ trilhaId, data }), {
    headers: auth,
    tags: { name: 'POST /api/visitas' },
  });
  const ok = check(criada, { 'planejar: status 201': (r) => r.status === 201 });
  if (!ok) return;

  const cancelada = http.patch(`${BASE_URL}/api/visitas/${criada.json('id')}/cancelar`, null, {
    headers: auth,
    tags: { name: 'PATCH /api/visitas/{id}/cancelar' },
  });
  check(cancelada, { 'cancelar: status 200': (r) => r.status === 200 });
}
