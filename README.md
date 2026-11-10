# Ecoturismo Rio

Catálogo de trilhas de ecoturismo do Rio de Janeiro.

- **frontend/** — React + Vite (JavaScript, sem TypeScript), Tailwind CSS, React Router 7, i18next (PT/ES/EN/FR), lucide-react
- **backend/** — Spring Boot 3.3 + Spring Security (JWT) + JPA, Java 17, MySQL 8 com migrações Flyway

### Ou separado: frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 — o Vite repassa /api para http://localhost:8080
```

## Banco de dados
```
backend/
├── db/criar-banco.sql                        banco + usuário (rodar uma vez, como administrador do MySQL)
└── src/main/resources/db/migration/
    ├── V1__criar_tabelas.sql                 esquema (adaptado da modelagem do projeto; mudanças comentadas no topo)
    └── V2__trilhas.sql                       46 trilhas da planilha + fotos do Wikimedia Commons
```
O Flyway roda as migrações em ordem e anota quais já rodou. **Não edite uma migração que já rodou**: para mudar o esquema ou os dados, crie `V3__descricao.sql`. O Hibernate não cria nem altera tabelas (`ddl-auto=none`).

Sobre os dados das trilhas (`V2__trilhas.sql`):
- **Distância 0** = ainda não levantada (Morro dos Cabritos, Cachoeira Imperatriz, Cachoeiras da Pedra Branca, Travessia Grumari x Guaratiba, Cachoeira do Amor, Morro das Andorinhas). Duração e altitude vazias quando a planilha não tinha.
- **Horários:** "24h" vira horário vazio; com janela de entrada ("06h/17h"), a abertura é a primeira hora e o fechamento é a saída ou, sem saída, a última entrada. O texto original fica em `observacaoHorario`.
- **Coordenadas** do OpenStreetMap. São aproximadas (estimadas a partir de um ponto vizinho) em: Morro do Visconde, Castelos da Taquara, Circuito das Grutas e Cachoeiras, Cachoeira do Jequitibá, Cachoeira Imperatriz, Garganta do Céu, Cachoeira Sorimã e Morro das Andorinhas.
- **Descrições** das trilhas novas foram escritas a partir da planilha e de fontes públicas: revise antes de publicar.

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/auth/register` (`{ nome, email, senha, dataNascimento }`) · `/api/auth/login` | público → `{ token, usuario }` |
| GET | `/api/trilhas?q=&dificuldade=FACIL&zona=SUL&duracao=CURTA` | público |
| GET | `/api/trilhas/destaques` · `/api/trilhas/{id}` · `/api/trilhas/{id}/avaliacoes` | público |
| POST | `/api/trilhas/{id}/curtir` | logado |
| POST/PUT/DELETE | `/api/trilhas[/{id}]` | ADMIN |
| GET/PUT | `/api/usuarios/me` | logado |
| POST/DELETE | `/api/usuarios/me/foto` (multipart, campo `arquivo`: JPG/PNG/WebP até 2 MB) | logado |
| GET | `/api/fotos/{arquivo}` (imagens enviadas: perfil e trilhas) | público |
| GET | `/api/usuarios/{id}/perfil` · `/avaliacoes` · `/visitas` · `/fotos` | logado |
| POST/DELETE · GET | `/api/usuarios/{id}/seguir` · `/seguidores` · `/seguindo` · `/amigos` (quem se segue mutuamente) | logado |
| POST/DELETE · GET | `/api/usuarios/{id}/bloquear` · `/api/usuarios/me/bloqueados` | logado |
| GET | `/api/feed?pagina=0&tamanho=20` (visitas concluídas dos amigos; máx. 50 por página) | logado |
| PUT | `/api/usuarios/me/senha` (`{ senhaAtual, novaSenha }` → novo `{ token, usuario }`) | logado |
| POST | `/api/auth/esqueci-senha` (`{ email }`, sempre 204) · `/api/auth/redefinir-senha` (`{ token, novaSenha }`) | público |
| POST | `/api/usuarios/{id}/denunciar` (`{ motivo, descricao }`) | logado |
| GET · PATCH | `/api/denuncias` · `/api/denuncias/{id}/analisada` | ADMIN |
| GET · POST/DELETE | `/api/trilhas/{id}/fotos` (público) · envio multipart `arquivo` + `legenda` (precisa de uma visita à trilha) · `/{fotoId}` | logado |
| GET/POST/PATCH | `/api/visitas/minhas` · `/api/visitas` (planejar) · `/api/visitas/concluida` (já feita, com nota) · `/{id}/concluir` · `/{id}/cancelar` | logado |
| POST | `/api/avisos` (sugestão / problema / perigo — formulário da home) | logado |
| GET | `/api/avisos/trilha/{id}` (perigos ativos) | público |
| GET · PATCH | `/api/avisos` · `/api/avisos/{id}/status?status=RESOLVIDO` | ADMIN |
| POST/GET/DELETE | `/api/parties` (`{ nome, descricao, trilhaId, data, horario }`) · `/minhas` · `/{id}` · `/{id}/sair` | logado |
| POST/GET/PATCH | `/api/convites` · `/recebidos` · `/{id}/aceitar` · `/{id}/recusar` | logado |

Valores aceitos: `dificuldade` = FACIL, MEDIO, DIFICIL (MEDIO aparece como "Moderado") · `zona` = SUL, NORTE, OESTE, CENTRO, FORA_DO_RIO · `duracao` = CURTA (≤2h), MEDIA (2–4h), LONGA (>4h). Notas das avaliações vão de 0,5 em 0,5 até 5.

## Imagens
- **Fotos do catálogo:** tabela `TRILHA_IMAGEM` (URL do Wikimedia Commons + página de crédito). Trilha sem foto, ou foto que não carrega, mostra uma ilustração gerada em `frontend/src/utils/trailArt.js`.
- **Fotos enviadas** (perfil e trilhas) ficam em `backend/uploads/` (ou em `UPLOADS_DIR`); o banco guarda só a URL.


## Testes de desempenho (k6)
Com o backend rodando, `npm run k6:smoke` (verificação rápida), `npm run k6:carga` (uso esperado, ~5 min) ou `npm run k6:estresse` (até o limite, ~9 min). Precisa do [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado. Detalhes, metas e como gerar o relatório em HTML: [tests/k6/README.md](tests/k6/README.md).

**Medições de SLA** (latência, vazão e limite de concorrência por serviço, com gráficos e hipóteses de gargalo): [docs/SLA.md](docs/SLA.md). Para gerar ou atualizar, rode o workflow **Medições de SLA (k6)** na aba Actions; veja [tests/k6/sla/README.md](tests/k6/sla/README.md).
