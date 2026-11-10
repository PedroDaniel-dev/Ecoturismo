// Carga em degraus, usada por todos os testes de SLA.
//
// Cada degrau tem N usuários virtuais (VUs) fazendo requisições sem pausa: cada VU espera a resposta e já manda
// a próxima. Assim, N VUs = N requisições simultâneas, e dá para ver em que degrau a API para de aguentar.
//
//   degrau 10:  sobe até 10 VUs (SUBIDA) e mantém 10 VUs (PATAMAR)
//   degrau 25:  sobe até 25 VUs e mantém
//   ...
//
// Só o PATAMAR entra nas estatísticas por degrau (a subida é transição). Toda requisição é marcada com as tags
// "degrau" e "fase" para o relatório separar os dados.
//
// Ajuste por variável de ambiente: -e DEGRAUS=10,25,50,100 -e SUBIDA=10 -e PATAMAR=50

import exec from 'k6/execution';

export const DEGRAUS = (__ENV.DEGRAUS || '10,25,50,100,150,200')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0);
export const SUBIDA_S = Number(__ENV.SUBIDA || 10);
export const PATAMAR_S = Number(__ENV.PATAMAR || 50);
export const MAX_VUS = Math.max(...DEGRAUS);

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Cenário ramping-vus com os degraus configurados. */
export function cenarioEmDegraus(exec_) {
  const stages = [];
  for (const vus of DEGRAUS) {
    stages.push({ duration: `${SUBIDA_S}s`, target: vus });
    stages.push({ duration: `${PATAMAR_S}s`, target: vus });
  }
  stages.push({ duration: '10s', target: 0 });
  return {
    executor: 'ramping-vus',
    exec: exec_,
    startVUs: 0,
    stages,
    gracefulRampDown: '5s',
  };
}

/** Marca as próximas métricas deste VU com o degrau e a fase atuais. Chame no início de cada iteração. */
export function marcarDegrau() {
  const decorrido = (Date.now() - exec.scenario.startTime) / 1000;
  const bloco = SUBIDA_S + PATAMAR_S;
  const i = Math.floor(decorrido / bloco);
  let degrau;
  let fase;
  if (i >= DEGRAUS.length) {
    degrau = 0;
    fase = 'descida';
  } else {
    degrau = DEGRAUS[i];
    fase = decorrido - i * bloco < SUBIDA_S ? 'subida' : 'patamar';
  }
  exec.vu.metrics.tags.degrau = String(degrau);
  exec.vu.metrics.tags.fase = fase;
}

/** Thresholds informativos: o k6 marca ✗ quando estoura, mas o teste vai até o fim (todos os degraus). */
export function metas(p95ms) {
  return {
    'http_req_failed{fase:patamar}': [{ threshold: 'rate<0.01', abortOnFail: false }],
    'http_req_duration{fase:patamar}': [{ threshold: `p(95)<${p95ms}`, abortOnFail: false }],
  };
}
