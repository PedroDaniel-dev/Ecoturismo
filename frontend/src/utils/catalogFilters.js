// Filtros do catálogo, guardados na URL com os mesmos valores da API do backend:
// /trilhas?dificuldade=FACIL&duracao=CURTA&zona=SUL
// Vários valores do mesmo filtro repetem o parâmetro (?dificuldade=FACIL&dificuldade=MODERADO).
// As coleções da Home vão como ?colecao=<slug> e são aplicadas por baixo, sem marcar os filtros da tela.

export const DIFFICULTY_PARAM = { 'Fácil': 'FACIL', 'Moderado': 'MEDIO', 'Difícil': 'DIFICIL' };
export const DIFFICULTY_DOT = { 'Fácil': 'bg-trail-easy', 'Moderado': 'bg-trail-moderate', 'Difícil': 'bg-trail-hard' };

export const ZONE_PARAM = {
  'Zona Sul': 'SUL', 'Zona Norte': 'NORTE', 'Zona Oeste': 'OESTE', 'Centro': 'CENTRO', 'Fora do Rio': 'FORA_DO_RIO',
};

// trilha sem duração conhecida não entra em nenhuma faixa (igual ao backend)
export const DURATIONS = [
  { id: 'CURTA', label: 'dur_short', test: h => h != null && h <= 2 },
  { id: 'MEDIA', label: 'dur_medium', test: h => h != null && h > 2 && h <= 4 },
  { id: 'LONGA', label: 'dur_long', test: h => h != null && h > 4 },
];

export const NO_FILTERS = { dificuldade: [], duracao: null, zona: [], atividade: [] };

const valid = (values, allowed) => values.filter(v => allowed.includes(v));

export function readFilters(params) {
  const duracao = params.get('duracao');
  return {
    dificuldade: valid(params.getAll('dificuldade'), Object.values(DIFFICULTY_PARAM)),
    duracao: DURATIONS.some(d => d.id === duracao) ? duracao : null,
    zona: valid(params.getAll('zona'), Object.values(ZONE_PARAM)),
    atividade: [],
  };
}

export function toSearchParams(filters) {
  const f = { ...NO_FILTERS, ...filters };
  const p = new URLSearchParams();
  f.dificuldade.forEach(v => p.append('dificuldade', v));
  if (f.duracao) p.set('duracao', f.duracao);
  f.zona.forEach(v => p.append('zona', v));
  return p;
}

export function matchesFilters(trail, filters) {
  const f = { ...NO_FILTERS, ...filters };
  if (f.dificuldade.length && !f.dificuldade.includes(DIFFICULTY_PARAM[trail.difficulty])) return false;
  if (f.zona.length && !f.zona.includes(ZONE_PARAM[trail.zone])) return false;
  if (f.duracao && !DURATIONS.find(d => d.id === f.duracao).test(trail.durationHours)) return false;
  // tipo de atividade não aparece nos filtros da tela: só as coleções usam (CAMINHADA, ESCALAMINHADA, CACHOEIRA)
  if (f.atividade.length && !f.atividade.includes(trail.activityCode)) return false;
  return true;
}

// Coleções da seção "Por onde começar" da Home. Textos em i18n: col_<id>_title / col_<id>_text; slug vai na URL.
export const COLLECTIONS = [
  { id: 'first', slug: 'primeira-trilha', filters: { dificuldade: ['FACIL'], duracao: 'CURTA' } },
  { id: 'waterfall', slug: 'cachoeiras', filters: { atividade: ['CACHOEIRA'] } },
  { id: 'morning', slug: 'manha-inteira', filters: { duracao: 'MEDIA' } },
  { id: 'challenge', slug: 'desafio', filters: { dificuldade: ['DIFICIL'] } },
];

export const collectionBySlug = slug => COLLECTIONS.find(c => c.slug === slug) || null;
