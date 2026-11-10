# Medições do SLA

Esta página é gerada automaticamente pelos testes de carga com k6 e ainda não tem medições.

**Para gerar:** aba **Actions** do repositório → **Medições de SLA (k6)** → **Run workflow**. Ao terminar, baixe o artefato **sla-pagina** e suba a pasta `docs` pelo site (**Add file → Upload files**). Esta página será substituída pela versão com as medições, os gráficos e as hipóteses de gargalo.

Serviços medidos:

1. **Busca no catálogo de trilhas** — leitura (`GET /api/trilhas`)
2. **Planejar e cancelar visita** — inserção e atualização (`POST /api/visitas`, `PATCH /api/visitas/{id}/cancelar`)
3. **Login** — leitura, pesada em CPU (`POST /api/auth/login`)

Detalhes de como a medição funciona: [`tests/k6/sla/README.md`](../tests/k6/sla/README.md).
