// SLA – Serviço 1: Busca no catálogo de trilhas (LEITURA)
//   GET /api/trilhas?q=&dificuldade=&zona=&duracao=
// Cada VU faz buscas sem pausa, com filtros sorteados como um visitante faria na página de trilhas.
//
//   k6 run --out csv=sla-saida/busca-trilhas.csv.gz tests/k6/sla/busca-trilhas.js

import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL, cenarioEmDegraus, marcarDegrau, metas } from './lib/degraus.js';

const BUSCAS = ['', '', 'pedra', 'cachoeira', 'morro', 'pico', 'tijuca', 'trilha', 'mirante', 'praia'];
const DIFICULDADES = ['FACIL', 'MEDIO', 'DIFICIL'];
const ZONAS = ['SUL', 'NORTE', 'OESTE', 'CENTRO', 'FORA_DO_RIO'];
const DURACOES = ['CURTA', 'MEDIA', 'LONGA'];
const sortear = (l) => l[Math.floor(Math.random() * l.length)];

export const options = {
  scenarios: { busca: cenarioEmDegraus('buscar') },
  thresholds: metas(500),
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const r = http.get(`${BASE_URL}/api/trilhas`);
  if (r.status !== 200) fail(`API fora do ar em ${BASE_URL} (status ${r.status})`);
}

export function buscar() {
  marcarDegrau();
  const params = [`q=${encodeURIComponent(sortear(BUSCAS))}`];
  if (Math.random() < 0.5) params.push(`dificuldade=${sortear(DIFICULDADES)}`);
  if (Math.random() < 0.5) params.push(`zona=${sortear(ZONAS)}`);
  if (Math.random() < 0.3) params.push(`duracao=${sortear(DURACOES)}`);

  const res = http.get(`${BASE_URL}/api/trilhas?${params.join('&')}`, {
    tags: { name: 'GET /api/trilhas' },
  });
  check(res, { 'busca: status 200': (r) => r.status === 200 });
}
