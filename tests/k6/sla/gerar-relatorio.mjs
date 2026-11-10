#!/usr/bin/env node
// Lê os resultados do k6 (CSV) e gera a página docs/SLA.md com tabelas e gráficos (Mermaid, que o GitHub desenha).
// Também salva os números em docs/sla/dados/ (CSV) e acumula um resumo em docs/sla/historico.json,
// para comparar medições de datas diferentes.
//
// Uso (na raiz do repositório):
//   node tests/k6/sla/gerar-relatorio.mjs [pasta-dos-resultados] [pasta-docs]
//   padrão: sla-saida  docs
//
// Em sla-saida/ ficam <servico>.csv.gz (k6 run --out csv=...) e, opcionalmente, ambiente.json.
// Só usa módulos do Node (sem npm install).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { SERVICOS, ARQUIVOS_MEDICAO_COMUNS } from './servicos.mjs';

const ENTRADA = process.argv[2] || 'sla-saida';
const DOCS = process.argv[3] || 'docs';
const JANELA_S = Number(process.env.JANELA_S || 10); // intervalo dos gráficos de evolução no tempo
const RAIZ_REL = '..'; // docs/SLA.md → raiz do repositório

// ---------- leitura do CSV do k6 ----------

async function lerResultados(arquivo) {
  const stream = fs.createReadStream(arquivo).pipe(arquivo.endsWith('.gz') ? zlib.createGunzip() : new (await import('node:stream')).PassThrough());
  const linhas = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let col = null;
  const brutos = { duracao: [], falha: [], vus: [] };
  let t0 = Infinity;

  for await (const linha of linhas) {
    if (!col) {
      col = Object.fromEntries(linha.split(',').map((n, i) => [n, i]));
      continue;
    }
    const c = linha.split(',');
    const metrica = c[col.metric_name];
    if (metrica !== 'http_req_duration' && metrica !== 'http_req_failed' && metrica !== 'vus') continue;

    let ts = Number(c[col.timestamp]);
    if (ts < 1e11) ts *= 1000; // CSV em segundos → milissegundos
    const valor = Number(c[col.metric_value]);

    if (metrica === 'vus') {
      brutos.vus.push({ ts, valor });
      continue;
    }
    if (!c[col.scenario]) continue; // requisições do setup (cadastro de usuários etc.) não contam

    const extras = Object.fromEntries(new URLSearchParams(c[col.extra_tags] || ''));
    const reg = { ts, valor, nome: c[col.name], degrau: Number(extras.degrau || 0), fase: extras.fase || '' };
    t0 = Math.min(t0, ts);
    (metrica === 'http_req_duration' ? brutos.duracao : brutos.falha).push(reg);
  }
  return { ...brutos, t0 };
}

// ---------- estatística ----------

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function percentil(ordenados, p) {
  if (!ordenados.length) return 0;
  const i = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, i)];
}

function analisar(brutos, servico) {
  const { t0 } = brutos;
  const janelaDe = (ts) => Math.floor((ts - t0) / (JANELA_S * 1000));

  // evolução no tempo (todas as fases)
  const jan = new Map();
  const pegar = (k) => {
    if (!jan.has(k)) jan.set(k, { soma: 0, n: 0, falhas: 0, vus: 0 });
    return jan.get(k);
  };
  for (const r of brutos.duracao) {
    const j = pegar(janelaDe(r.ts));
    j.soma += r.valor;
    j.n += 1;
  }
  for (const r of brutos.falha) pegar(janelaDe(r.ts)).falhas += r.valor;
  for (const v of brutos.vus) {
    if (v.ts < t0) continue;
    const j = pegar(janelaDe(v.ts));
    j.vus = Math.max(j.vus, v.valor);
  }
  const ultima = Math.max(...jan.keys());
  const janelas = [];
  for (let k = 0; k <= ultima; k++) {
    const j = jan.get(k) || { soma: 0, n: 0, falhas: 0, vus: 0 };
    janelas.push({
      inicioS: k * JANELA_S,
      latenciaMedia: j.n ? j.soma / j.n : 0,
      vazao: j.n / JANELA_S,
      erros: j.n ? (100 * j.falhas) / j.n : 0,
      vus: j.vus,
      requisicoes: j.n,
    });
  }
  // a última janela costuma ser parcial (descida); não distorce os gráficos
  if (janelas.length > 1 && janelas.at(-1).requisicoes < janelas.at(-2).requisicoes * 0.5) janelas.pop();

  // por degrau (só o patamar)
  const porDegrau = new Map();
  const grupo = (d) => {
    if (!porDegrau.has(d)) porDegrau.set(d, { duracoes: [], falhas: 0, n: 0, ini: Infinity, fim: 0, porEndpoint: new Map() });
    return porDegrau.get(d);
  };
  for (const r of brutos.duracao) {
    if (r.fase !== 'patamar') continue;
    const g = grupo(r.degrau);
    g.duracoes.push(r.valor);
    g.ini = Math.min(g.ini, r.ts);
    g.fim = Math.max(g.fim, r.ts);
    const e = g.porEndpoint.get(r.nome) || { soma: 0, n: 0 };
    e.soma += r.valor;
    e.n += 1;
    g.porEndpoint.set(r.nome, e);
  }
  for (const r of brutos.falha) {
    if (r.fase !== 'patamar') continue;
    const g = grupo(r.degrau);
    g.falhas += r.valor;
    g.n += 1;
  }

  const degraus = [...porDegrau.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([vus, g]) => {
      const ord = Float64Array.from(g.duracoes).sort();
      const segundos = Math.max(1, (g.fim - g.ini) / 1000);
      const vazao = g.duracoes.length / segundos;
      const latenciaMedia = media(g.duracoes);
      return {
        vus,
        requisicoes: g.duracoes.length,
        latenciaMedia,
        p95: percentil(ord, 95),
        p99: percentil(ord, 99),
        max: ord.length ? ord[ord.length - 1] : 0,
        vazao,
        erros: g.n ? (100 * g.falhas) / g.n : 0,
        // Lei de Little: requisições em andamento no servidor = vazão × latência
        concorrenciaEfetiva: vazao * (latenciaMedia / 1000),
        porEndpoint: Object.fromEntries([...g.porEndpoint].map(([n, e]) => [n, e.soma / e.n])),
      };
    });

  // limite de concorrência: maior degrau, antes da primeira falha, com erros < 1% e p95 dentro da meta
  let limite = null;
  let primeiroEstouro = null;
  for (const d of degraus) {
    if (d.erros < 1 && d.p95 <= servico.metaP95) limite = d;
    else {
      primeiroEstouro = d;
      break;
    }
  }
  const vazaoMax = degraus.reduce((m, d) => (d.vazao > m.vazao ? d : m), degraus[0] || { vazao: 0, vus: 0 });
  const saturacao = degraus.find((d) => d.vazao >= 0.9 * vazaoMax.vazao) || null;

  const todas = Float64Array.from(brutos.duracao.map((r) => r.valor)).sort();
  const duracaoS = janelas.length * JANELA_S;
  return {
    janelas,
    degraus,
    limite,
    primeiroEstouro,
    vazaoMax,
    saturacao,
    geral: {
      requisicoes: todas.length,
      latenciaMedia: media(Array.from(todas)),
      p95: percentil(todas, 95),
      vazaoMedia: duracaoS ? todas.length / duracaoS : 0,
      erros: brutos.falha.length ? (100 * brutos.falha.reduce((a, r) => a + r.valor, 0)) / brutos.falha.length : 0,
      maxVus: Math.max(0, ...brutos.vus.map((v) => v.valor)),
      duracaoS,
    },
  };
}

// ---------- formatação ----------

const fmt = (n, casas = 1) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) : '–';
const ms = (n) => `${fmt(n, n >= 100 ? 0 : 1)} ms`;
const arred = (n) => Math.round(n * 10) / 10;

function teto(v) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  return Math.ceil((v * 1.1) / exp) * exp;
}

/** Gráfico Mermaid xychart (o GitHub desenha). series: [{ tipo: 'line'|'bar', valores, cor }] */
function grafico({ titulo, eixoX, rotulos, eixoY, series }) {
  const max = teto(Math.max(...series.flatMap((s) => s.valores), 0));
  const cores = series.map((s) => s.cor).join(', ');
  return [
    '```mermaid',
    '---',
    'config:',
    '  xyChart:',
    '    width: 900',
    '    height: 360',
    '  themeVariables:',
    '    xyChart:',
    `      plotColorPalette: "${cores}"`,
    '---',
    'xychart-beta',
    `  title "${titulo}"`,
    `  x-axis "${eixoX}" [${rotulos.map((r) => `"${r}"`).join(', ')}]`,
    `  y-axis "${eixoY}" 0 --> ${max}`,
    ...series.map((s) => `  ${s.tipo} [${s.valores.map(arred).join(', ')}]`),
    '```',
  ].join('\n');
}

const link = (arquivo) => `[\`${arquivo}\`](${RAIZ_REL}/${arquivo})`;
// mesma regra do GitHub para âncoras de títulos
const ancora = (t) => t.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-');
const legenda = (itens) => itens.map(([cor, texto]) => `${cor} ${texto}`).join(' · ');

// ---------- página ----------

function secaoServico(n, s, r, amb, dataBR, pastaDados) {
  const L = [];
  const { geral, degraus, janelas, limite, primeiroEstouro, vazaoMax, saturacao } = r;
  const endpoints = degraus.length ? Object.keys(degraus[0].porEndpoint) : [];

  L.push(`## ${n}. ${s.nome}`, '');
  L.push(`- **Tipo de operações:** ${s.operacoes}`);
  L.push(`- **Endpoints:** ${s.endpoints.map((e) => `\`${e}\``).join(', ')}`);
  L.push(`- **Data da medição:** ${dataBR}`);
  L.push('', s.descricao, '');

  L.push('### Arquivos envolvidos', '');
  for (const a of s.arquivos) L.push(`- ${link(a)}`);
  L.push('', '### Arquivos com o código-fonte da medição do SLA', '');
  for (const a of [...s.medicao, ...ARQUIVOS_MEDICAO_COMUNS]) L.push(`- ${link(a)}`);
  const dado = (f) => `[\`docs/${pastaDados}/${f}\`](${pastaDados}/${f})`;
  L.push(`- Dados desta medição: ${dado(`${s.id}-janelas.csv`)} · ${dado(`${s.id}-degraus.csv`)}`);

  L.push('', '### Configuração', '');
  L.push(`Veja [Configuração do ambiente](#configuração-do-ambiente). Resumo: ${amb.resumo}.`);

  L.push('', '### Testes de carga (SLA)', '');
  L.push('| Indicador | Resultado |', '|---|---|');
  L.push(`| **Latência** (tempo de resposta médio, teste inteiro) | ${ms(geral.latenciaMedia)} (p95: ${ms(geral.p95)}) |`);
  L.push(`| **Vazão** média (teste inteiro) | ${fmt(geral.vazaoMedia)} req/s |`);
  L.push(`| **Vazão máxima** (média de um degrau) | ${fmt(vazaoMax.vazao)} req/s com ${vazaoMax.vus} usuários simultâneos |`);
  L.push(
    `| **Concorrência — limite de requisições simultâneas** | ${
      limite
        ? `**${limite.vus}** (maior degrau com erros < 1% e p95 ≤ ${s.metaP95} ms)`
        : `abaixo de ${degraus[0]?.vus ?? '?'} (já o primeiro degrau ficou fora da meta)`
    } |`,
  );
  L.push(`| Ponto de saturação da vazão | ${saturacao ? `${saturacao.vus} usuários (a partir daqui, mais usuários não aumentam a vazão)` : '–'} |`);
  L.push(`| Requisições / erros | ${geral.requisicoes.toLocaleString('pt-BR')} / ${fmt(geral.erros, 2)}% |`);
  L.push('');

  L.push('#### Evolução no tempo', '');
  L.push(`Cada ponto é a média de uma janela de ${JANELA_S} s. Os degraus de usuários simultâneos aparecem no último gráfico.`, '');
  const rot = janelas.map((j) => `${j.inicioS}`);
  L.push(grafico({ titulo: `Latência média (ms) a cada ${JANELA_S} s`, eixoX: 'tempo (s)', rotulos: rot, eixoY: 'ms', series: [{ tipo: 'line', valores: janelas.map((j) => j.latenciaMedia), cor: s.cor }] }), '');
  L.push(grafico({ titulo: `Vazão (req/s) a cada ${JANELA_S} s`, eixoX: 'tempo (s)', rotulos: rot, eixoY: 'req/s', series: [{ tipo: 'bar', valores: janelas.map((j) => j.vazao), cor: s.cor }] }), '');
  L.push(grafico({ titulo: 'Concorrência: usuários simultâneos (VUs)', eixoX: 'tempo (s)', rotulos: rot, eixoY: 'VUs', series: [{ tipo: 'line', valores: janelas.map((j) => j.vus), cor: '#6b7280' }] }), '');

  L.push('#### Por degrau de concorrência', '');
  L.push(legenda([['🔵', 'latência média'], ['🟠', 'p95']]), '');
  const rotD = degraus.map((d) => `${d.vus}`);
  L.push(grafico({ titulo: 'Latência (ms) por usuários simultâneos', eixoX: 'usuários simultâneos', rotulos: rotD, eixoY: 'ms', series: [
    { tipo: 'line', valores: degraus.map((d) => d.latenciaMedia), cor: '#2563eb' },
    { tipo: 'line', valores: degraus.map((d) => d.p95), cor: '#f59e0b' },
  ] }), '');
  L.push(grafico({ titulo: 'Vazão (req/s) por usuários simultâneos', eixoX: 'usuários simultâneos', rotulos: rotD, eixoY: 'req/s', series: [{ tipo: 'bar', valores: degraus.map((d) => d.vazao), cor: s.cor }] }), '');

  L.push('| Usuários simultâneos | Requisições | Latência média | p95 | p99 | Vazão (req/s) | Erros | Concorrência efetiva¹ | Dentro do SLA? |');
  L.push('|---:|---:|---:|---:|---:|---:|---:|---:|:---:|');
  for (const d of degraus) {
    const ok = d.erros < 1 && d.p95 <= s.metaP95;
    L.push(`| ${d.vus} | ${d.requisicoes.toLocaleString('pt-BR')} | ${ms(d.latenciaMedia)} | ${ms(d.p95)} | ${ms(d.p99)} | ${fmt(d.vazao)} | ${fmt(d.erros, 2)}% | ${fmt(d.concorrenciaEfetiva)} | ${ok ? '✅' : '❌'} |`);
  }
  L.push('', `¹ Lei de Little: vazão × latência média = quantas requisições estavam, em média, dentro do servidor ao mesmo tempo. SLA usado: erros < 1% e p95 ≤ ${s.metaP95} ms.`, '');

  if (endpoints.length > 1) {
    L.push('Latência média por endpoint em cada degrau:', '');
    L.push(`| Usuários simultâneos | ${endpoints.map((e) => `\`${e}\``).join(' | ')} |`);
    L.push(`|---:|${endpoints.map(() => '---:').join('|')}|`);
    for (const d of degraus) L.push(`| ${d.vus} | ${endpoints.map((e) => ms(d.porEndpoint[e] ?? NaN)).join(' | ')} |`);
    L.push('');
  }

  L.push('### Levantamento de hipóteses de gargalos', '');
  L.push('**O que os dados desta medição mostram:**', '');
  L.push(...evidencias(r, s).map((e) => `- ${e}`), '');
  L.push('**Hipóteses, a partir do código:**', '');
  s.hipoteses.forEach((h, i) => L.push(`${i + 1}. ${h}`));
  L.push('');
  return L.join('\n');
}

/** Frases automáticas sobre o comportamento observado, para apoiar as hipóteses. */
function evidencias(r, s) {
  const { degraus, limite, primeiroEstouro, vazaoMax, saturacao } = r;
  const out = [];
  if (!degraus.length) return ['Sem dados de patamar: confira se o teste rodou até o fim.'];
  const a = degraus[0];
  const z = degraus.at(-1);
  out.push(
    `De ${a.vus} para ${z.vus} usuários simultâneos (${fmt(z.vus / a.vus, 0)}× mais), a latência média foi de ${ms(a.latenciaMedia)} para ${ms(z.latenciaMedia)} (${fmt(z.latenciaMedia / Math.max(a.latenciaMedia, 0.001))}×) e a vazão de ${fmt(a.vazao)} para ${fmt(z.vazao)} req/s (${fmt(z.vazao / Math.max(a.vazao, 0.001))}×).`,
  );
  if (saturacao && saturacao.vus < z.vus) {
    out.push(
      `A vazão chegou a 90% do máximo (${fmt(vazaoMax.vazao)} req/s) já com ${saturacao.vus} usuários. Daí em diante, mais usuários só aumentaram a espera: sinal de que algum recurso (CPU, conexões com o banco ou threads) está no limite e as requisições fazem fila.`,
    );
  } else {
    out.push('A vazão continuou crescendo até o último degrau: o limite da API está acima da maior carga testada. Rode de novo com degraus maiores (entrada "degraus" do workflow).');
  }
  if (primeiroEstouro) {
    out.push(
      `O SLA (erros < 1% e p95 ≤ ${s.metaP95} ms) deixou de ser atendido com ${primeiroEstouro.vus} usuários: p95 de ${ms(primeiroEstouro.p95)} e ${fmt(primeiroEstouro.erros, 2)}% de erros.`,
    );
  } else {
    out.push(`O SLA (erros < 1% e p95 ≤ ${s.metaP95} ms) foi atendido em todos os degraus.`);
  }
  if (degraus.some((d) => d.erros >= 1)) {
    out.push('Apareceram erros nos degraus mais altos: veja o log do backend (artefato do workflow) para saber se são timeouts, falta de conexão com o banco ou erros 500.');
  }
  return out;
}

function secaoComparacao(resultados) {
  const L = ['## Comparação entre os serviços', ''];
  L.push('| Serviço | Operações | Latência média | p95 | Vazão média | Vazão máxima | Limite de requisições simultâneas | Erros |');
  L.push('|---|---|---:|---:|---:|---:|---:|---:|');
  for (const { s, r } of resultados) {
    L.push(`| ${s.marcador} ${s.nome} | ${s.operacoes} | ${ms(r.geral.latenciaMedia)} | ${ms(r.geral.p95)} | ${fmt(r.geral.vazaoMedia)} req/s | ${fmt(r.vazaoMax.vazao)} req/s | ${r.limite ? r.limite.vus : `< ${r.degraus[0]?.vus ?? '?'}`} | ${fmt(r.geral.erros, 2)}% |`);
  }
  L.push('');
  const vus = [...new Set(resultados.flatMap(({ r }) => r.degraus.map((d) => d.vus)))].sort((a, b) => a - b);
  const valor = (r, v, campo) => r.degraus.find((d) => d.vus === v)?.[campo] ?? 0;
  L.push(legenda(resultados.map(({ s }) => [s.marcador, s.nome])), '');
  L.push(grafico({ titulo: 'Latência média (ms) por usuários simultâneos', eixoX: 'usuários simultâneos', rotulos: vus, eixoY: 'ms', series: resultados.map(({ s, r }) => ({ tipo: 'line', valores: vus.map((v) => valor(r, v, 'latenciaMedia')), cor: s.cor })) }), '');
  L.push(grafico({ titulo: 'Vazão (req/s) por usuários simultâneos', eixoX: 'usuários simultâneos', rotulos: vus, eixoY: 'req/s', series: resultados.map(({ s, r }) => ({ tipo: 'line', valores: vus.map((v) => valor(r, v, 'vazao')), cor: s.cor })) }), '');
  L.push(grafico({ titulo: 'p95 (ms) por usuários simultâneos', eixoX: 'usuários simultâneos', rotulos: vus, eixoY: 'ms', series: resultados.map(({ s, r }) => ({ tipo: 'line', valores: vus.map((v) => valor(r, v, 'p95')), cor: s.cor })) }), '');
  return L.join('\n');
}

function secaoHistorico(historico) {
  const L = ['## Histórico de medições', ''];
  L.push('Cada data de medição acrescenta uma linha por serviço (rodar de novo no mesmo dia substitui as linhas daquele dia). Use para comparar antes e depois de uma otimização.', '');
  L.push('| Data | Serviço | Latência média | p95 | Vazão máxima | Limite de req. simultâneas | Ambiente |');
  L.push('|---|---|---:|---:|---:|---:|---|');
  for (const h of [...historico].reverse()) {
    L.push(`| ${h.data} | ${h.servico} | ${ms(h.latenciaMedia)} | ${ms(h.p95)} | ${fmt(h.vazaoMax)} req/s | ${h.limite ?? '–'} | ${h.ambiente} |`);
  }
  L.push('');
  return L.join('\n');
}

function lerAmbiente() {
  const arq = path.join(ENTRADA, 'ambiente.json');
  const a = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  const v = (k) => a[k] || 'não informado';
  const resumo = a.nucleos
    ? `${a.origem || 'máquina local'}, ${a.nucleos} núcleos, ${a.memoria}, backend + MySQL + k6 na mesma máquina`
    : 'não informado';
  const linhas = [
    '| Item | Valor |',
    '|---|---|',
    `| Onde rodou | ${v('origem')}${a.execucaoUrl ? ` ([execução](${a.execucaoUrl}))` : ''} |`,
    `| Sistema operacional | ${v('so')} |`,
    `| Processador | ${v('cpu')} (${v('nucleos')} núcleos) |`,
    `| Memória | ${v('memoria')} |`,
    `| Backend | Spring Boot 3.3 (jar), ${v('java')}, Tomcat com até 200 threads, HikariCP com 10 conexões (padrões do Spring Boot) |`,
    `| Banco de dados | ${v('mysql')} |`,
    `| Gerador de carga | ${v('k6')} |`,
    `| Degraus de usuários simultâneos | ${v('degraus')} (subida de ${v('subida')} s + patamar de ${v('patamar')} s cada) |`,
    '| Observação | Backend, banco e k6 rodaram na mesma máquina e disputam CPU e memória. Os usuários virtuais não fazem pausa entre requisições, então cada usuário = 1 requisição simultânea. |',
  ];
  return { resumo, tabela: linhas.join('\n'), curto: a.nucleos ? `${a.origem || 'local'} · ${a.nucleos} núcleos` : 'não informado' };
}

function salvarCsv(arquivo, linhas) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, linhas.map((l) => l.join(',')).join('\n') + '\n');
}

// ---------- principal ----------

const agora = process.env.DATA_MEDICAO ? new Date(process.env.DATA_MEDICAO) : new Date();
const dataBR = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const dataISO = agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
const pastaDados = `sla/dados/${dataISO}`; // relativa a docs/
const amb = lerAmbiente();

const resultados = [];
for (const s of SERVICOS) {
  const arq = [`${s.id}.csv.gz`, `${s.id}.csv`].map((f) => path.join(ENTRADA, f)).find((f) => fs.existsSync(f));
  if (!arq) {
    console.warn(`(sem resultados para ${s.id}, pulando)`);
    continue;
  }
  const r = analisar(await lerResultados(arq), s);
  if (!r.degraus.length) {
    console.warn(`(resultados de ${s.id} sem dados de patamar, pulando)`);
    continue;
  }
  resultados.push({ s, r });

  salvarCsv(`${DOCS}/${pastaDados}/${s.id}-janelas.csv`, [
    ['inicio_s', 'latencia_media_ms', 'vazao_req_s', 'erros_pct', 'vus', 'requisicoes'],
    ...r.janelas.map((j) => [j.inicioS, j.latenciaMedia.toFixed(2), j.vazao.toFixed(2), j.erros.toFixed(2), j.vus, j.requisicoes]),
  ]);
  salvarCsv(`${DOCS}/${pastaDados}/${s.id}-degraus.csv`, [
    ['vus', 'requisicoes', 'latencia_media_ms', 'p95_ms', 'p99_ms', 'max_ms', 'vazao_req_s', 'erros_pct', 'concorrencia_efetiva'],
    ...r.degraus.map((d) => [d.vus, d.requisicoes, d.latenciaMedia.toFixed(2), d.p95.toFixed(2), d.p99.toFixed(2), d.max.toFixed(2), d.vazao.toFixed(2), d.erros.toFixed(2), d.concorrenciaEfetiva.toFixed(2)]),
  ]);
  console.log(`${s.id}: ${r.geral.requisicoes} requisições, limite ${r.limite?.vus ?? '<' + r.degraus[0].vus} VUs, vazão máx. ${r.vazaoMax.vazao.toFixed(1)} req/s`);
}

if (!resultados.length) {
  console.error(`Nenhum resultado encontrado em ${ENTRADA}/. Rode os testes com --out csv=${ENTRADA}/<servico>.csv.gz`);
  process.exit(1);
}

// histórico: substitui as linhas da mesma data e acrescenta as novas
const arqHistorico = `${DOCS}/sla/historico.json`;
let historico = fs.existsSync(arqHistorico) ? JSON.parse(fs.readFileSync(arqHistorico, 'utf8')) : [];
historico = historico.filter((h) => h.dataISO !== dataISO);
for (const { s, r } of resultados) {
  historico.push({
    dataISO,
    data: dataBR,
    servico: s.nome,
    latenciaMedia: r.geral.latenciaMedia,
    p95: r.geral.p95,
    vazaoMax: r.vazaoMax.vazao,
    limite: r.limite?.vus ?? null,
    ambiente: amb.curto,
  });
}
fs.mkdirSync(path.dirname(arqHistorico), { recursive: true });
fs.writeFileSync(arqHistorico, JSON.stringify(historico, null, 2) + '\n');

const pagina = [
  '# Medições do SLA',
  '',
  `Testes de carga da API do Ecoturismo Rio feitos com [k6](https://grafana.com/docs/k6/latest/). Última medição: **${dataBR}**.`,
  '',
  '**Como foi medido.** Cada serviço é testado sozinho, com carga em degraus: um número fixo de usuários virtuais faz requisições seguidas, sem pausa, e esse número sobe a cada degrau. Como não há pausa, *N usuários = N requisições simultâneas*. Em cada degrau são medidos:',
  '',
  '- **Latência:** tempo de resposta médio (e p95: 95% das respostas foram mais rápidas que esse valor);',
  `- **Vazão:** requisições atendidas por segundo (média do degrau e a cada janela de ${JANELA_S} s nos gráficos de evolução);`,
  '- **Concorrência:** o limite de requisições simultâneas é o maior degrau em que a API ainda cumpriu o SLA (erros < 1% e p95 dentro da meta do serviço).',
  '',
  '**Sumário**',
  '',
  ...resultados.map(({ s }, i) => `${i + 1}. [${s.nome}](#${ancora(`${i + 1}. ${s.nome}`)}) — ${s.operacoes.charAt(0).toLowerCase()}${s.operacoes.slice(1)}`),
  `${resultados.length + 1}. [Comparação entre os serviços](#comparação-entre-os-serviços)`,
  `${resultados.length + 2}. [Configuração do ambiente](#configuração-do-ambiente)`,
  `${resultados.length + 3}. [Histórico de medições](#histórico-de-medições)`,
  `${resultados.length + 4}. [Como repetir as medições](#como-repetir-as-medições)`,
  '',
  ...resultados.map(({ s, r }, i) => secaoServico(i + 1, s, r, amb, dataBR, pastaDados)),
  secaoComparacao(resultados),
  '## Configuração do ambiente',
  '',
  amb.tabela,
  '',
  secaoHistorico(historico),
  '## Como repetir as medições',
  '',
  'No GitHub: aba **Actions** → **Medições de SLA (k6)** → **Run workflow**. Ao terminar, baixe o artefato `sla-pagina`, que já contém esta página atualizada e os dados, e suba a pasta `docs` para o repositório. Para rodar na sua máquina, veja [`tests/k6/sla/README.md`](../tests/k6/sla/README.md).',
  '',
].join('\n');

fs.writeFileSync(`${DOCS}/SLA.md`, pagina);
console.log(`Página gerada: ${DOCS}/SLA.md`);
