# Testes de desempenho com k6

Testes de carga da API do Ecoturismo usando o [k6](https://grafana.com/docs/k6/latest/). Eles só fazem leituras e login, então não criam nem apagam nada no banco.

```
tests/k6/
├── lib/config.js   URL da API, conta de teste e filtros usados nas buscas
├── lib/fluxos.js   o que cada usuário virtual faz (visitante, logado, login)
├── smoke.js        30 s, 1 usuário por cenário: confere se tudo responde
├── carga.js        ~5 min, 40 visitantes + 10 logados + 2 logins/s: uso esperado
└── estresse.js     ~9 min, sobe até 200 visitantes: descobre o limite da API
```

As **medições de SLA por serviço** (busca, visitas e login, com a página `docs/SLA.md`) ficam em [`sla/`](sla/README.md).

## Instalar o k6

| Sistema | Comando |
|---|---|
| Windows | `winget install k6 --source winget` (ou `choco install k6`) |
| macOS | `brew install k6` |
| Linux (Debian/Ubuntu) | veja os passos em https://grafana.com/docs/k6/latest/set-up/install-k6/ |
| Docker | `docker run --rm -i --network host grafana/k6 run - < tests/k6/smoke.js` |

Confira com `k6 version`.

## Rodar

1. Suba o backend (`npm run back` na raiz, ou `cd backend && ./mvnw spring-boot:run`). As contas de teste precisam existir: elas são criadas na inicialização quando `app.teste.email` está preenchido em `application.properties`.
2. Na raiz do projeto, rode um dos testes:

```bash
npm run k6:smoke      # ou: k6 run tests/k6/smoke.js
npm run k6:carga      # ou: k6 run tests/k6/carga.js
npm run k6:estresse   # ou: k6 run tests/k6/estresse.js
```

Comece sempre pelo smoke: se ele falhar, os outros não fazem sentido.

### Relatório em HTML

O k6 gera um relatório com gráficos (bom para colocar na entrega do PI):

```bash
# macOS / Linux / Git Bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=tests/k6/resultados/carga.html k6 run tests/k6/carga.js

# Windows (PowerShell)
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="tests/k6/resultados/carga.html"; k6 run tests/k6/carga.js
```

Enquanto o teste roda, o painel ao vivo fica em http://localhost:5665. A pasta `tests/k6/resultados/` não vai para o Git.

### Variáveis

Passe com `-e NOME=valor`, por exemplo `k6 run -e BASE_URL=http://192.168.0.10:8080 tests/k6/carga.js`.

| Variável | Padrão | Para quê |
|---|---|---|
| `BASE_URL` | `http://localhost:8080` | endereço do backend |
| `K6_EMAIL` / `K6_SENHA` | conta da Marina (`DataSeeder`) | usuário do fluxo logado |
| `VISITANTES` / `LOGADOS` | 40 / 10 | tamanho da carga em `carga.js` |
| `PICO` | 200 | número máximo de visitantes em `estresse.js` |

## O que cada teste faz

- **Visitante** (sem login): abre os destaques da home, busca trilhas com filtros aleatórios (`q`, `dificuldade`, `zona`, `duracao`) e abre os detalhes de uma trilha, carregando avaliações, fotos e avisos em paralelo, como a página faz.
- **Logado**: carrega `/api/usuarios/me`, o feed dos amigos e as próprias visitas. Todos os usuários virtuais usam o mesmo token, obtido uma vez no início.
- **Login**: só faz `POST /api/auth/login`. Fica separado porque o BCrypt deixa o login lento de propósito, e misturar com o resto distorceria os tempos.

## Metas (thresholds)

Se uma meta não for atingida, o k6 mostra ✗ no resumo e termina com código de erro.

| Teste | Metas |
|---|---|
| smoke | nenhuma requisição com erro, todos os checks passando, p95 < 500 ms |
| carga | erros < 1%, p95 < 500 ms (visitante e logado), p99 < 1 s (visitante), p95 do login < 1,5 s |
| estresse | erros < 5%, p95 < 2 s (metas folgadas: o que importa é ver onde a API cede) |

"p95 < 500 ms" quer dizer que 95% das respostas chegaram em menos de meio segundo.

## Lendo o resultado

- `checks_succeeded`: porcentagem de respostas com o status esperado.
- `http_req_failed`: porcentagem de requisições com erro (4xx/5xx ou sem resposta).
- `http_req_duration`: tempo de resposta. Olhe `p(95)` mais que a média.
- `http_reqs`: total de requisições e quantas por segundo a API atendeu.

No estresse, compare os degraus no relatório HTML: o ponto em que o p95 dispara ou os erros começam é o limite da API na sua máquina.

Os números dependem do computador: backend, banco e k6 rodando na mesma máquina disputam CPU. Anote a configuração junto com os resultados.
