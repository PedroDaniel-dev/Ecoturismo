import { trailArt } from './trailArt';

// O catálogo vem do backend (/api/trilhas, dados no MySQL). fromApi converte a resposta para o formato que as telas
// usam: rótulos em português (que também são a base das chaves de tradução) e textos prontos ("1h30", "3 km").

export const ZONES = ['Zona Sul', 'Zona Norte', 'Zona Oeste', 'Centro', 'Fora do Rio'];
export const DIFFICULTIES = ['Fácil', 'Moderado', 'Difícil'];

const ZONE_LABEL = { SUL: 'Zona Sul', NORTE: 'Zona Norte', OESTE: 'Zona Oeste', CENTRO: 'Centro', FORA_DO_RIO: 'Fora do Rio' };
const DIFFICULTY_LABEL = { FACIL: 'Fácil', MEDIO: 'Moderado', DIFICIL: 'Difícil' };
const ACTIVITY_KEY = { CAMINHADA: 'activity_hike', ESCALAMINHADA: 'activity_hike_climb', CACHOEIRA: 'activity_waterfall' };
const ROUTE_KEY = { IDA_E_VOLTA: 'route_out_back', CIRCUITO: 'route_loop', TRAVESSIA: 'route_point' };

export const zoneKey = z => ({ 'Zona Sul': 'south_zone', 'Zona Norte': 'north_zone', 'Zona Oeste': 'west_zone', 'Centro': 'center_zone', 'Fora do Rio': 'outside_rio' }[z] || 'south_zone');
export const difficultyKey = d => ({ 'Fácil': 'easy', 'Moderado': 'moderate', 'Difícil': 'hard' }[d] || 'easy');

// "90" -> "1h30", "45" -> "45 min"
export const formatDuration = min => {
  if (min == null) return null;
  if (min < 60) return `${min} min`;
  const rest = min % 60;
  return `${Math.floor(min / 60)}h${rest ? String(rest).padStart(2, '0') : ''}`;
};
// 0 = distância ainda não levantada
export const formatDistance = km => (!km ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${String(+km).replace('.', ',')} km`);
export const formatAltitude = m => (m == null ? null : `${m.toLocaleString('pt-BR')} m`);
// "06:30:00" -> "6h30"
export const formatTime = s => {
  if (!s) return null;
  const [h, m] = s.split(':').map(Number);
  return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
};

// paisagem da ilustração usada quando a trilha não tem foto
const sceneOf = t => (t.tipoAtividade === 'CACHOEIRA' ? 'forest' : t.tipoAtividade === 'ESCALAMINHADA' || t.id % 2 === 0 ? 'mountain' : 'sea');

export function fromApi(t) {
  const fallbacks = [0, 1, 2].map(v => trailArt(t.id, sceneOf(t), v));
  const hasPhotos = t.imagens.length > 0;
  return {
    id: t.id,
    name: t.nome,
    location: t.localizacao,
    park: t.parque,
    zone: ZONE_LABEL[t.zona],
    zoneCode: t.zona,
    difficulty: DIFFICULTY_LABEL[t.dificuldade],
    difficultyCode: t.dificuldade,
    durationMinutes: t.duracaoMinutos,
    durationHours: t.duracaoMinutos == null ? null : t.duracaoMinutos / 60,
    time: formatDuration(t.duracaoMinutos),
    length: formatDistance(Number(t.distancia)),
    altitude: formatAltitude(t.altitude),
    activityType: ACTIVITY_KEY[t.tipoAtividade],
    activityCode: t.tipoAtividade,
    routeType: ROUTE_KEY[t.tipoPercurso],
    fee: Number(t.taxa),
    featured: t.destaque,
    maintenance: t.situacao === 'MANUTENCAO',
    opensAt: formatTime(t.horarioAbertura),
    closesAt: formatTime(t.horarioFechamento),
    // "06:30", para comparar com o horário de uma party
    opensAtRaw: t.horarioAbertura?.slice(0, 5) || null,
    closesAtRaw: t.horarioFechamento?.slice(0, 5) || null,
    schedule: t.observacaoHorario,
    shortDescription: t.descricaoCurta,
    description: t.descricao,
    howToGetThere: t.comoChegar,
    lat: Number(t.latitude),
    lng: Number(t.longitude),
    // sem foto no catálogo, a ilustração gerada ocupa o lugar dela
    images: hasPhotos ? t.imagens.map(i => i.url) : fallbacks,
    credits: hasPhotos ? t.imagens.map(i => i.creditoUrl) : [],
    fallbacks,
  };
}
