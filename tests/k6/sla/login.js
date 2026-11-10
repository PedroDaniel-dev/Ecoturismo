// SLA – Serviço 3: Login (LEITURA, com custo alto de CPU por causa do BCrypt)
//   POST /api/auth/login → busca o usuário pelo e-mail, confere a senha com BCrypt e gera um JWT
//
// Usa a conta de teste da Marina, criada pelo DataSeeder. Troque com -e K6_EMAIL=... -e K6_SENHA=...
//
//   k6 run --out csv=sla-saida/login.csv.gz tests/k6/sla/login.js

import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL, JSON_HEADERS, cenarioEmDegraus, marcarDegrau, metas } from './lib/degraus.js';

const CORPO = JSON.stringify({
  email: __ENV.K6_EMAIL || 'marina@ecoturismo.rio',
  senha: __ENV.K6_SENHA || 'senha1234',
});

export const options = {
  scenarios: { login: cenarioEmDegraus('logar') },
  thresholds: metas(1000),
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const r = http.post(`${BASE_URL}/api/auth/login`, CORPO, { headers: JSON_HEADERS });
  if (r.status !== 200) fail(`Login de teste falhou (status ${r.status}). As contas de teste foram criadas?`);
}

export function logar() {
  marcarDegrau();
  const res = http.post(`${BASE_URL}/api/auth/login`, CORPO, {
    headers: JSON_HEADERS,
    tags: { name: 'POST /api/auth/login' },
  });
  check(res, { 'login: status 200': (r) => r.status === 200 });
}
