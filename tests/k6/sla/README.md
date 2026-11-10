# Medições de SLA (k6)

Testes de carga por serviço, em degraus de usuários simultâneos, que geram a página [`docs/SLA.md`](../../../docs/SLA.md) com latência, vazão e limite de concorrência, gráficos e hipóteses de gargalo.

| Serviço | Operação | Script |
|---|---|---|
| Busca no catálogo de trilhas (`GET /api/trilhas`) | leitura | [`busca-trilhas.js`](busca-trilhas.js) |
| Planejar e cancelar visita (`POST /api/visitas`, `PATCH /api/visitas/{id}/cancelar`) | inserção e atualização | [`visitas.js`](visitas.js) |
| Login (`POST /api/auth/login`) | leitura, pesada em CPU | [`login.js`](login.js) |

Outros arquivos:
- [`lib/degraus.js`](lib/degraus.js): monta a carga em degraus e marca cada requisição com o degrau.
- [`servicos.mjs`](servicos.mjs): descrição, arquivos envolvidos, meta de p95 e hipóteses de cada serviço (o texto da página sai daqui).
- [`gerar-relatorio.mjs`](gerar-relatorio.mjs): lê os resultados do k6 e escreve `docs/SLA.md`, os CSV em `docs/sla/dados/` e o histórico em `docs/sla/historico.json`.
- [`../../../.github/workflows/sla-k6.yml`](../../../.github/workflows/sla-k6.yml): roda tudo no GitHub Actions.

## Como a carga funciona

Cada degrau mantém um número fixo de usuários virtuais (padrão: 10, 25, 50, 100, 150 e 200) por 50 s, depois de 10 s de subida. Os usuários não fazem pausa: mandam a próxima requisição assim que a anterior responde. Por isso **N usuários = N requisições simultâneas**.

- **Latência:** tempo de resposta médio (e p95) de cada degrau e de cada janela de 10 s.
- **Vazão:** requisições por segundo de cada degrau e de cada janela de 10 s.
- **Limite de concorrência:** maior degrau, antes da primeira falha, com erros < 1% e p95 dentro da meta (500 ms para busca e visitas, 1000 ms para login).

Cada serviço dura cerca de 6 minutos com os valores padrão.

## Rodar no GitHub Actions (recomendado)

1. Aba **Actions** do repositório → **Medições de SLA (k6)** → **Run workflow** (dá para mudar os degraus e o tempo de cada um) → **Run workflow**.
2. Espere terminar (cerca de 25 minutos). O resumo da execução já mostra a página.
3. No fim da página da execução, em **Artifacts**, baixe **sla-pagina**.
4. Extraia e suba a pasta `docs` pelo site: **Add file → Upload files**, arraste a pasta, escreva a mensagem e clique em **Commit changes**.

O workflow só lê o repositório: ele não faz commit. O artefato **sla-brutos** tem os resultados completos do k6 e o log do backend, caso precise investigar erros.

## Rodar na sua máquina

Precisa de Java 17, MySQL 8, Node 18+ e k6. Use um banco de teste: o serviço de visitas grava no banco (cria 200 usuários e milhares de visitas por execução).

```bash
# 1. backend rodando (em outro terminal)
npm run back

# 2. testes (na raiz do projeto)
mkdir -p sla-saida
export K6_CSV_TIME_FORMAT=unix_milli
for s in busca-trilhas visitas login; do
  k6 run --system-tags status,name,scenario,expected_response --out csv=sla-saida/$s.csv.gz tests/k6/sla/$s.js
done

# 3. página
node tests/k6/sla/gerar-relatorio.mjs sla-saida docs
```

No Windows (PowerShell), troque `export` por `$env:K6_CSV_TIME_FORMAT="unix_milli"` e rode os três `k6 run` um de cada vez.

Sem o arquivo `sla-saida/ambiente.json`, a tabela de configuração fica como "não informado": preencha à mão no `docs/SLA.md` (processador, memória, sistema, versões) ou crie o arquivo com os campos usados no workflow.

Para testar mais rápido: `-e DEGRAUS=5,10,20 -e PATAMAR=20`.
