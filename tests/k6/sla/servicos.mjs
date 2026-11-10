// Descrição dos serviços medidos: o que entra na página docs/SLA.md além dos números.
// Os caminhos são relativos à raiz do repositório; a página transforma em links.

export const SERVICOS = [
  {
    id: 'busca-trilhas',
    nome: 'Busca no catálogo de trilhas',
    operacoes: 'Leitura',
    cor: '#2563eb',
    marcador: '🔵',
    metaP95: 500,
    endpoints: ['GET /api/trilhas?q=&dificuldade=&zona=&duracao='],
    descricao:
      'Página "Trilhas" do site: o visitante digita um texto e escolhe filtros de dificuldade, zona e duração. ' +
      'Não precisa de login. Cada usuário virtual faz buscas seguidas, sem pausa, com filtros sorteados.',
    arquivos: [
      'backend/src/main/java/br/com/ecoturismo/trilha/TrilhaController.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/TrilhaService.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/TrilhaRepository.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/Trilha.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/ImagemTrilha.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/dto/TrilhaResponse.java',
      'backend/src/main/java/br/com/ecoturismo/trilha/dto/FaixaDuracao.java',
      'backend/src/main/java/br/com/ecoturismo/security/SecurityConfig.java',
      'backend/src/main/resources/db/migration/V1__criar_tabelas.sql',
      'backend/src/main/resources/db/migration/V2__trilhas.sql',
      'frontend/src/pages/Trails.jsx',
    ],
    medicao: ['tests/k6/sla/busca-trilhas.js'],
    hipoteses: [
      '**Catálogo inteiro a cada requisição.** `TrilhaService.buscar()` chama `repository.findAll()` e só depois filtra em memória (Java Streams). Qualquer busca, mesmo a mais restrita, lê as 46 trilhas completas do banco. O custo cresce com o tamanho do catálogo, não com o resultado.',
      '**Consultas N+1 nas imagens.** `Trilha.imagens` é `@ElementCollection(fetch = EAGER)`: o Hibernate faz 1 consulta para as trilhas e mais 1 consulta em `TRILHA_IMAGEM` para cada trilha (cerca de 47 consultas por busca). Com o pool padrão do HikariCP (10 conexões), as requisições disputam conexões e fazem fila.',
      '**CPU na normalização do texto.** Para cada trilha, em cada requisição, o nome, a localização, a zona e o parque passam por `Normalizer.normalize` e uma expressão regular (para buscar sem acento). Com muitos usuários simultâneos isso consome CPU do backend.',
      '**Resposta pesada.** `TrilhaResponse` devolve a descrição completa, "como chegar" e a lista de imagens de todas as trilhas encontradas. A serialização em JSON e o tamanho da resposta pesam mais que a consulta quando a busca é ampla.',
      '**Sem cache.** O catálogo quase nunca muda, mas toda busca vai ao banco. Um cache em memória (`@Cacheable`) ou buscar as imagens com `JOIN FETCH`/`@BatchSize` devem reduzir bastante a latência; vale medir antes e depois.',
    ],
  },
  {
    id: 'visitas',
    nome: 'Planejar e cancelar visita',
    operacoes: 'Inserção e atualização',
    cor: '#dc2626',
    marcador: '🔴',
    metaP95: 500,
    endpoints: ['POST /api/visitas (inserção)', 'PATCH /api/visitas/{id}/cancelar (atualização)'],
    descricao:
      'Usuário logado planeja uma visita a uma trilha (insere uma linha em `VISITA`) e em seguida a cancela ' +
      '(atualiza o status para `CANCELADA`). Antes do teste é cadastrado um usuário para cada usuário virtual, ' +
      'e cada iteração usa uma data diferente por causa do índice `UNIQUE (idUsuario, idTrilha, data)`. ' +
      'Os números deste serviço somam as duas requisições; a tabela por endpoint separa cada uma.',
    arquivos: [
      'backend/src/main/java/br/com/ecoturismo/visita/VisitaController.java',
      'backend/src/main/java/br/com/ecoturismo/visita/VisitaService.java',
      'backend/src/main/java/br/com/ecoturismo/visita/VisitaRepository.java',
      'backend/src/main/java/br/com/ecoturismo/visita/Visita.java',
      'backend/src/main/java/br/com/ecoturismo/visita/StatusVisita.java',
      'backend/src/main/java/br/com/ecoturismo/visita/dto/VisitaRequest.java',
      'backend/src/main/java/br/com/ecoturismo/visita/dto/VisitaResponse.java',
      'backend/src/main/java/br/com/ecoturismo/security/JwtAuthFilter.java',
      'backend/src/main/java/br/com/ecoturismo/security/JwtService.java',
      'backend/src/main/java/br/com/ecoturismo/usuario/UsuarioService.java',
      'backend/src/main/java/br/com/ecoturismo/usuario/Usuario.java',
      'backend/src/main/resources/db/migration/V1__criar_tabelas.sql',
    ],
    medicao: ['tests/k6/sla/visitas.js'],
    hipoteses: [
      '**Pool de conexões pequeno.** O HikariCP usa 10 conexões por padrão e cada requisição abre uma transação (`@Transactional` em `VisitaService`). Com mais de 10 requisições simultâneas, as excedentes esperam uma conexão livre: a vazão para de crescer e a latência sobe em proporção ao número de usuários.',
      '**Muitas consultas por escrita.** Antes do `INSERT`, a requisição já buscou o mesmo usuário três vezes: duas no `JwtAuthFilter` (`findByEmail` para conferir a versão do token e `loadUserByUsername` para as permissões) e uma em `UsuarioService.buscarPorEmail`, cada uma carregando também a coleção de curtidas (`EAGER`). Depois ainda vêm `existsById` da trilha e `existsBy...` para o índice único. O cancelamento repete a busca do usuário e faz `findById` antes do `UPDATE`. A maior parte do tempo é leitura, não escrita.',
      '**Custo da escrita no MySQL.** Cada `INSERT` confere o índice `UNIQUE (idUsuario, idTrilha, data)` e duas chaves estrangeiras, e cada commit grava o log de transações em disco (`innodb_flush_log_at_trx_commit = 1`). No GitHub Actions o disco é compartilhado, o que pode limitar a vazão de escrita.',
      '**Verificar e depois inserir não é atômico.** `exigirDataLivre()` consulta e só depois insere. Sob concorrência, duas requisições iguais podem passar pela verificação e uma delas estoura o índice único com erro 500 em vez de 409. Neste teste as datas não se repetem, mas é um risco para uso real.',
      '**Tudo na mesma máquina.** Backend, MySQL e o próprio k6 disputam os mesmos núcleos de CPU. Parte do aumento de latência nos degraus altos pode vir dessa disputa, e não só da aplicação.',
    ],
  },
  {
    id: 'login',
    nome: 'Login',
    operacoes: 'Leitura (com custo alto de CPU)',
    cor: '#16a34a',
    marcador: '🟢',
    metaP95: 1000,
    endpoints: ['POST /api/auth/login'],
    descricao:
      'Login com e-mail e senha. Busca o usuário, confere a senha com BCrypt e gera um token JWT. ' +
      'Todos os usuários virtuais usam a conta de teste da Marina (criada pelo `DataSeeder`).',
    arquivos: [
      'backend/src/main/java/br/com/ecoturismo/security/AuthController.java',
      'backend/src/main/java/br/com/ecoturismo/security/SecurityConfig.java',
      'backend/src/main/java/br/com/ecoturismo/security/UsuarioDetailsService.java',
      'backend/src/main/java/br/com/ecoturismo/security/JwtService.java',
      'backend/src/main/java/br/com/ecoturismo/security/dto/LoginRequest.java',
      'backend/src/main/java/br/com/ecoturismo/security/dto/AuthResponse.java',
      'backend/src/main/java/br/com/ecoturismo/usuario/UsuarioService.java',
      'backend/src/main/java/br/com/ecoturismo/usuario/Usuario.java',
      'backend/src/main/java/br/com/ecoturismo/config/DataSeeder.java',
    ],
    medicao: ['tests/k6/sla/login.js'],
    hipoteses: [
      '**BCrypt limita a vazão.** `SecurityConfig` usa `new BCryptPasswordEncoder()` (custo 10): cada login gasta dezenas de milissegundos de CPU de propósito, para dificultar ataques de força bruta. A vazão máxima fica perto de *(número de núcleos) ÷ (tempo de um BCrypt)*; acima disso, mais usuários só aumentam a fila.',
      '**Fila nas threads do Tomcat.** O Tomcat atende até 200 requisições ao mesmo tempo (padrão do Spring Boot). Como cada login prende uma thread enquanto calcula o BCrypt, com muitos usuários as threads ficam todas ocupadas e as novas requisições esperam.',
      '**Usuário carregado duas vezes.** `UsuarioDetailsService` busca o usuário para o Spring Security e o `AuthController` busca de novo (`buscarPorEmail`) para montar a resposta, cada vez carregando a coleção de curtidas (`EAGER`). É pouco perto do BCrypt, mas soma consultas ao banco.',
      '**Disputa de CPU com o k6.** Como o gargalo é CPU, o k6 rodando na mesma máquina rouba processamento do backend. Em um ambiente com o k6 em outra máquina a vazão de login tende a ser maior.',
      '**Comparação esperada.** Por ser limitado por CPU e não pelo banco, o login deve saturar com bem menos usuários simultâneos que a busca, com vazão máxima bem menor: isso confirma que o BCrypt, e não o MySQL, é o gargalo deste serviço.',
    ],
  },
];

export const ARQUIVOS_MEDICAO_COMUNS = [
  'tests/k6/sla/lib/degraus.js',
  'tests/k6/sla/gerar-relatorio.mjs',
  'tests/k6/sla/servicos.mjs',
  '.github/workflows/sla-k6.yml',
];
