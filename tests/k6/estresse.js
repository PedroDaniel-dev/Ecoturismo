// Teste de estresse: aumenta a carga em degraus, bem acima do esperado, para descobrir onde a API começa a falhar.
// Não é para "passar": o objetivo é ver em que degrau o tempo de resposta dispara ou os erros aparecem.
// Dura cerca de 9 minutos. Rode só na sua máquina ou num ambiente de teste, nunca contra produção.
//   k6 run tests/k6/estresse.js

import { preparar, navegarCatalogo, usarLogado } from './lib/fluxos.js';

const PICO = Number(__ENV.PICO || 200);

export const options = {
  scenarios: {
    visitante: {
      executor: 'ramping-vus',
      exec: 'visitante',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.round(PICO * 0.25) },
        { duration: '1m30s', target: Math.round(PICO * 0.25) },
        { duration: '1m', target: Math.round(PICO * 0.5) },
        { duration: '1m30s', target: Math.round(PICO * 0.5) },
        { duration: '1m', target: PICO },
        { duration: '2m', target: PICO },
        { duration: '1m', target: 0 }, // recuperação: a API volta ao normal?
      ],
    },
    logado: {
      executor: 'ramping-vus',
      exec: 'logado',
      startVUs: 0,
      stages: [
        { duration: '2m30s', target: Math.round(PICO * 0.1) },
        { duration: '2m30s', target: Math.round(PICO * 0.2) },
        { duration: '3m', target: Math.round(PICO * 0.3) },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    // metas mais folgadas; se estourar, o k6 marca como falha mas o teste vai até o fim
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export const setup = preparar;
export const visitante = navegarCatalogo;
export const logado = usarLogado;
