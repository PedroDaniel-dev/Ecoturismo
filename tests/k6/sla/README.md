# Medições de SLA (k6)

Testes de carga por serviço, em patamares de usuários simultâneos. Os resultados, com tabelas, gráficos e hipóteses de gargalo, ficam em [`docs/SLA.md`](../../../docs/SLA.md).

| Serviço | Operação | Script |
|---|---|---|
| Busca no catálogo de trilhas (`GET /api/trilhas`) | leitura | [`busca-trilhas.js`](busca-trilhas.js) |
| Planejar e cancelar visita (`POST /api/visitas`, `PATCH /api/visitas/{id}/cancelar`) | inserção e atualização | [`visitas.js`](visitas.js) |
| Login (`POST /api/auth/login`) | leitura, pesada em CPU | [`login.js`](login.js) |

Outros arquivos:
- [`lib/degraus.js`](lib/degraus.js): monta a carga em patamares e marca cada requisição com o patamar.
- [`rodar-testes.bat`](rodar-testes.bat): roda os três serviços e chama o `graficos.py` (Windows).
- [`graficos.py`](graficos.py): lê o CSV do k6, gera os PNG em `docs/sla/medicao-N/` e preenche `docs/SLA.md`.
- [`limpar-dados-de-carga.sql`](limpar-dados-de-carga.sql): apaga os usuários e as visitas criados pelo teste de visitas.
- [`ajustes-mysql.sql`](ajustes-mysql.sql): aumenta o redo log e o buffer pool do MySQL (usado na medição 2; vale até o MySQL reiniciar).
- [`../../../.github/workflows/sla-k6.yml`](../../../.github/workflows/sla-k6.yml): a mesma medição no GitHub Actions.

## Como a carga funciona

Cada patamar mantém um número fixo de usuários virtuais (padrão: 10, 25, 50, 100, 150 e 200) por 50 s, depois de 10 s de subida. Os usuários não fazem pausa: mandam a próxima requisição assim que a anterior responde. Por isso **N usuários = N requisições simultâneas**.

- **Latência:** média, p95 e p99 de cada patamar e evolução segundo a segundo.
- **Vazão:** requisições por segundo de cada patamar e segundo a segundo.
- **Limite de concorrência:** maior patamar, antes do primeiro que falha, com erros < 1% e p95 dentro da meta (500 ms para busca e visitas, 1000 ms para login).

Cada serviço dura cerca de 6 minutos e meio com os valores padrão.

## Medição 1 e medição 2

A página tem duas medições por serviço: a 1 com o sistema como está e a 2 depois das otimizações. O `graficos.py` só reescreve o que está entre os marcadores `<!-- ... -->` da página, então o texto escrito à mão (hipóteses, otimizações feitas) é preservado. Na medição 2 ele também compara com a 1, usando `docs/sla/medicao-1/resumo.json`.

## Rodar na sua máquina (Windows)

Precisa de Java 17 ou mais novo, MySQL 8, k6 e Python com matplotlib (`winget install k6 --source winget`, `pip install matplotlib`).

1. Suba o backend: `npm run back` na raiz do projeto.
2. Dois cliques em `rodar-testes.bat` (medição 1), ou no terminal `tests\k6\sla\rodar-testes.bat 2` (medição 2).
3. Se rodou no banco de desenvolvimento, apague os dados de carga: `mysql -u ecoturismo -p ecoturismo < tests\k6\sla\limpar-dados-de-carga.sql`.

Em macOS ou Linux, os mesmos passos à mão:

```bash
mkdir -p sla-saida
export K6_CSV_TIME_FORMAT=unix_milli
for s in busca-trilhas visitas login; do
  k6 run --system-tags status,name,scenario,expected_response --out csv=sla-saida/$s.csv.gz tests/k6/sla/$s.js
done
python3 tests/k6/sla/graficos.py 1
```

Para testar mais rápido (não serve para a entrega): `-e DEGRAUS=5,10,20 -e PATAMAR=20` no `k6 run`, ou `set DEGRAUS=5,10,20` e `set PATAMAR=20` antes do `.bat`.

## Rodar no GitHub Actions

1. Aba **Actions** do repositório → **Medições de SLA (k6)** → **Run workflow**, escolha a medição (dá para mudar os patamares e o tempo de cada um) → **Run workflow**.
2. Espere terminar (cerca de 25 minutos). O resumo da execução já mostra a página.
3. Em **Artifacts**, baixe **sla-pagina**, extraia e suba a pasta `docs` para o repositório.

O workflow só lê o repositório: ele não faz commit. O artefato **sla-brutos** tem os CSV completos do k6 e o log do backend, caso precise investigar erros.
