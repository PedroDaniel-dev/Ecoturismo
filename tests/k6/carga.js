// Teste de carga: simula o uso esperado em um dia movimentado e confere se a API aguenta dentro das metas.
// Dura cerca de 5 minutos.
//   k6 run tests/k6/carga.js
//   K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/k6/resultados/carga.html k6 run tests/k6/carga.js   (gera relatório HTML)

import { preparar, navegarCatalogo, usarLogado, fazerLogin } from './lib/fluxos.js';

const VISITANTES = Number(__ENV.VISITANTES || 40);
const LOGADOS = Number(__ENV.LOGADOS || 10);

export const options = {
  scenarios: {
    // maioria do tráfego: gente navegando no catálogo sem login
    visitante: {
      executor: 'ramping-vus',
      exec: 'visitante',
      startVUs: 0,
      stages: [
        { duration: '1m', target: VISITANTES }, // sobe
        { duration: '3m', target: VISITANTES }, // mantém
        { duration: '30s', target: 0 },         // desce
      ],
    },
    // usuários logados olhando perfil e feed
    logado: {
      executor: 'ramping-vus',
      exec: 'logado',
      startVUs: 0,
      stages: [
        { duration: '1m', target: LOGADOS },
        { duration: '3m', target: LOGADOS },
        { duration: '30s', target: 0 },
      ],
    },
    // logins chegando num ritmo fixo (2 por segundo), independente de quanto a API demora
    login: {
      executor: 'constant-arrival-rate',
      exec: 'login',
      rate: 2,
      timeUnit: '1s',
      duration: '4m',
      startTime: '30s',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],                                // menos de 1% de erros
    checks: ['rate>0.99'],
    'http_req_duration{scenario:visitante}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{scenario:logado}': ['p(95)<500'],
    'http_req_duration{name:POST /api/auth/login}': ['p(95)<1500'], // BCrypt é lento de propósito
  },
};

export const setup = preparar;
export const visitante = navegarCatalogo;
export const logado = usarLogado;
export const login = fazerLogin;
