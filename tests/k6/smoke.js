// Smoke test: poucos usuários por pouco tempo, só para ver se tudo responde.
// Rode antes dos outros testes (e depois de cada mudança grande no backend).
//   k6 run tests/k6/smoke.js

import { preparar, navegarCatalogo, usarLogado, fazerLogin } from './lib/fluxos.js';

export const options = {
  scenarios: {
    visitante: { executor: 'constant-vus', exec: 'visitante', vus: 1, duration: '30s' },
    logado: { executor: 'constant-vus', exec: 'logado', vus: 1, duration: '30s' },
    login: { executor: 'per-vu-iterations', exec: 'login', vus: 1, iterations: 3 },
  },
  thresholds: {
    http_req_failed: ['rate==0'],     // nenhuma requisição pode falhar
    checks: ['rate==1'],              // todos os checks precisam passar
    http_req_duration: ['p(95)<500'], // 95% das respostas em menos de 500 ms
  },
};

export const setup = preparar;
export const visitante = navegarCatalogo;
export const logado = usarLogado;
export const login = fazerLogin;
