# Ecoturismo Rio

Catálogo de trilhas de ecoturismo do Rio de Janeiro.

- **frontend/** — React + Vite (JavaScript, sem TypeScript), Tailwind CSS, React Router 7, i18next (PT/ES/EN/FR), lucide-react
- **backend/** — Spring Boot 3.3 + Spring Security (JWT) + JPA, Java 17, MySQL 8 com migrações Flyway

Tudo vem do banco: catálogo de trilhas, contas, curtidas, avaliações, seguidores, grupos e avisos. O frontend não funciona sem o backend.

## Rodando

### 1. Banco (uma vez só)
Com o MySQL 8 instalado e rodando, crie o banco e o usuário:
```bash
sudo mysql < backend/db/criar-banco.sql
```
As tabelas e as 46 trilhas não são criadas aqui: o backend faz isso sozinho ao iniciar (Flyway).

### 2. Backend e frontend juntos
Na raiz do projeto (na primeira vez, rode `npm install` aqui e em `frontend/`):
```bash
npm run dev        # sobe os dois no mesmo terminal; Ctrl+C derruba os dois
```
As linhas do backend aparecem com `[back]` e as do frontend com `[front]`. Também dá para subir um de cada vez com `npm run back` e `npm run front`.

### Ou separado: backend
```bash
cd backend
./mvnw spring-boot:run   # http://localhost:8080 (o Maven Wrapper baixa o Maven na primeira vez)
./mvnw test              # testes de integração (H2 em memória no modo MySQL, mesmas migrações)
```
Conexão: `DB_URL`, `DB_USER` e `DB_PASSWORD` (padrão `ecoturismo` / `ecoturismo123`, os mesmos de `criar-banco.sql`).
Admin criado na inicialização: `admin@ecoturismo.rio` / `admin123` (altere em `application.properties`).
Contas de teste, também criadas na inicialização: `pedrodanielcf@gmail.com`, `marina@ecoturismo.rio` e `lucas@ecoturismo.rio`, todas com a senha `senha1234`. Para não criá-las, deixe `app.teste.email` vazio.
Defina `JWT_SECRET` (≥ 32 caracteres) em produção.

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

## Estrutura do backend
```
backend/src/main/java/br/com/ecoturismo/
├── usuario/      Usuario, Role, UsuarioController, UsuarioService, UsuarioRepository, dto/
├── trilha/       Trilha, Dificuldade, Zona, TrilhaController, TrilhaService, TrilhaRepository, dto/
├── visita/       Visita, StatusVisita, VisitaController, VisitaService, VisitaRepository, dto/
├── avisoperigo/  AvisoPerigo, TipoAviso, StatusAviso, controller, service, repository, dto/
├── party/        Party (grupo para fazer trilha), controller, service, repository, dto/
├── convite/      Convite para entrar numa party, controller, service, repository, dto/
├── seguidor/     Seguimento (seguir sem aceite; quem se segue mutuamente é amigo), controller, service, repository, dto/
├── feed/         FeedController/FeedService: visitas concluídas dos amigos, mais recentes primeiro
├── recuperacaosenha/ RecuperacaoSenha (link de uso único por e-mail, guarda só o hash), controller, service, repository, dto/
├── bloqueio/     Bloqueio (desfaz seguir/amizade, cancela convites e esconde um do outro em perfis, listas, feed, avaliações e fotos), controller, service, repository
├── denuncia/     Denuncia, MotivoDenuncia, StatusDenuncia, controller, service, repository, dto/
├── fototrilha/   FotoTrilha (foto de um usuário numa trilha, presa a uma visita dele), controller, service, repository, dto/
├── perfil/       PerfilController/PerfilService: cabeçalho e abas do perfil (avaliações = visitas concluídas com nota)
├── security/     SecurityConfig, JwtService, JwtAuthFilter, UsuarioDetailsService, AuthController, dto/
└── config/       CorsConfig, ImagemStorage, UploadsConfig, EnvioEmail, GlobalExceptionHandler, DataSeeder (admin + contas de teste)
```

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

## Senha
Trocar a senha (`PUT /api/usuarios/me/senha`) ou redefinir pelo link de recuperação invalida todos os tokens emitidos antes: cada usuário tem uma versão (`versaoToken`) que vai dentro do JWT, e o filtro recusa tokens de versão antiga. A troca já devolve um token novo.

O e-mail de recuperação ainda **não é enviado**: `config/EnvioEmail` só escreve no log do backend, então o link aparece no console. Para enviar de verdade, adicione `spring-boot-starter-mail`, configure `spring.mail.*` e use um `JavaMailSender` em `EnvioEmail.enviar`. O link aponta para `FRONTEND_URL` (padrão `http://localhost:5173`) em `/redefinir-senha?token=…`.

## Imagens
- **Fotos do catálogo:** tabela `TRILHA_IMAGEM` (URL do Wikimedia Commons + página de crédito). Trilha sem foto, ou foto que não carrega, mostra uma ilustração gerada em `frontend/src/utils/trailArt.js`.
- **Fotos enviadas** (perfil e trilhas) ficam em `backend/uploads/` (ou em `UPLOADS_DIR`); o banco guarda só a URL.

## Detalhes do frontend
- **Transição card → trilha:** View Transitions API (`<Link viewTransition>` + `view-transition-name` igual na imagem do card e na da página). Funciona em Chrome/Edge/Safari 18+; nos demais navegadores a navegação acontece sem animação.
- **Temas:** variáveis CSS em `src/index.css` — claro (off-white + dourado) e escuro (azul petróleo + prata).
- **Hero:** foto aérea do Rio e "RIO" gigante, com parallax por scroll e mouse (`components/Hero.jsx`). Respeita `prefers-reduced-motion`.
- **Idiomas:** `src/i18n/index.js`. As descrições das trilhas estão só em português.
