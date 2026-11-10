// Configuração compartilhada pelos testes de k6.
// Tudo pode ser trocado por variável de ambiente: k6 run -e BASE_URL=http://meu-servidor:8080 tests/k6/smoke.js

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

// Conta usada no fluxo de usuário logado. O padrão é a Marina, criada pelo DataSeeder
// (app.teste.email preenchido em application.properties). Troque se o seu banco não tiver as contas de teste.
export const USUARIO = {
  email: __ENV.K6_EMAIL || 'marina@ecoturismo.rio',
  senha: __ENV.K6_SENHA || 'senha1234',
};

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Filtros aceitos por GET /api/trilhas (veja a tabela de endpoints no README principal)
export const BUSCAS = ['pedra', 'cachoeira', 'morro', 'pico', 'tijuca', ''];
export const DIFICULDADES = ['FACIL', 'MEDIO', 'DIFICIL'];
export const ZONAS = ['SUL', 'NORTE', 'OESTE', 'CENTRO', 'FORA_DO_RIO'];
export const DURACOES = ['CURTA', 'MEDIA', 'LONGA'];

export function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}
