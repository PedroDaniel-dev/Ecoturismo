-- Esquema do Ecoturismo Rio, adaptado da modelagem original (seção 3.1 do documento do projeto).
-- Mudanças em relação ao original:
--   * USUARIO usa idUsuario como chave; CPF ficou opcional e único. As outras tabelas apontam para idUsuario.
--   * TRILHA ganhou os campos que o site mostra (local, parque, duração, altitude, percurso, descrição...),
--     zona FORA_DO_RIO, horários opcionais ("24h" = sem horário) e distância 0 quando não se sabe.
--   * VISITA guarda também visitas planejadas e canceladas (status); nota e comentário só valem para as concluídas.
--     A curtida saiu da visita e virou a tabela CURTIDA (curtir a trilha não depende de ter ido).
--   * PARTY ganhou nome e a tabela PARTY_MEMBRO; CONVITE guarda quem convidou.
--   * AVISO_PERIGO: visita e trilha opcionais (o formulário da página inicial aceita sugestões de trilhas novas).
--   * Tabelas novas para o que o site já faz: CURTIDA, SEGUIMENTO, BLOQUEIO, DENUNCIA, RECUPERACAO_SENHA, TRILHA_IMAGEM.

CREATE TABLE USUARIO (
    idUsuario BIGINT PRIMARY KEY AUTO_INCREMENT,
    cpf CHAR(11) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    dataNascimento DATE NOT NULL,
    telefone VARCHAR(20),
    bio VARCHAR(250),
    fotoUrl VARCHAR(500),
    papel ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    versaoToken INT NOT NULL DEFAULT 0,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TRILHA (
    idTrilha BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    localizacao VARCHAR(150) NOT NULL,
    parque VARCHAR(150),
    zona ENUM('NORTE', 'SUL', 'OESTE', 'CENTRO', 'FORA_DO_RIO') NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    taxa DECIMAL(8, 2) NOT NULL DEFAULT 0,
    horarioAbertura TIME,
    horarioFechamento TIME,
    observacaoHorario VARCHAR(250),
    dificuldade ENUM('FACIL', 'MEDIO', 'DIFICIL') NOT NULL,
    distancia DECIMAL(5, 2) NOT NULL DEFAULT 0,
    duracaoMinutos INT,
    altitude INT,
    tipoPercurso ENUM('IDA_E_VOLTA', 'CIRCUITO', 'TRAVESSIA') NOT NULL,
    tipoAtividade ENUM('CAMINHADA', 'ESCALAMINHADA', 'CACHOEIRA') NOT NULL,
    situacao ENUM('ABERTA', 'MANUTENCAO') NOT NULL DEFAULT 'ABERTA',
    descricaoCurta VARCHAR(250) NOT NULL,
    descricao TEXT,
    comoChegar VARCHAR(500),
    destaque BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (nome, latitude, longitude)
);

CREATE TABLE TRILHA_IMAGEM (
    idImagem BIGINT PRIMARY KEY AUTO_INCREMENT,
    idTrilha BIGINT NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    url VARCHAR(500) NOT NULL,
    creditoUrl VARCHAR(500),
    FOREIGN KEY (idTrilha) REFERENCES TRILHA(idTrilha) ON DELETE CASCADE
);

CREATE TABLE CURTIDA (
    idUsuario BIGINT NOT NULL,
    idTrilha BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (idUsuario, idTrilha),
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idTrilha) REFERENCES TRILHA(idTrilha) ON DELETE CASCADE
);

CREATE TABLE VISITA (
    idVisita BIGINT PRIMARY KEY AUTO_INCREMENT,
    data DATE NOT NULL,
    status ENUM('PLANEJADA', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PLANEJADA',
    -- meia estrela: de 0,5 em 0,5 até 5
    nota DECIMAL(3, 1) CHECK (nota IS NULL OR (nota BETWEEN 0.5 AND 5 AND nota * 2 = FLOOR(nota * 2))),
    comentario VARCHAR(250),
    idTrilha BIGINT NOT NULL,
    idUsuario BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idTrilha) REFERENCES TRILHA(idTrilha) ON DELETE CASCADE,
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    UNIQUE (idUsuario, idTrilha, data)
);

CREATE TABLE PARTY (
    idParty BIGINT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    descricao VARCHAR(250),
    idTrilha BIGINT NOT NULL,
    idCriador BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idTrilha) REFERENCES TRILHA(idTrilha) ON DELETE CASCADE,
    FOREIGN KEY (idCriador) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE
);

CREATE TABLE PARTY_MEMBRO (
    idParty BIGINT NOT NULL,
    idUsuario BIGINT NOT NULL,
    PRIMARY KEY (idParty, idUsuario),
    FOREIGN KEY (idParty) REFERENCES PARTY(idParty) ON DELETE CASCADE,
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE
);

CREATE TABLE CONVITE (
    idConvite BIGINT PRIMARY KEY AUTO_INCREMENT,
    status ENUM('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    idParty BIGINT NOT NULL,
    idConvidado BIGINT NOT NULL,
    idRemetente BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idParty) REFERENCES PARTY(idParty) ON DELETE CASCADE,
    FOREIGN KEY (idConvidado) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idRemetente) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    UNIQUE (idParty, idConvidado)
);

CREATE TABLE AVISO_PERIGO (
    idAviso BIGINT PRIMARY KEY AUTO_INCREMENT,
    dataHoraEmissao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- SUGESTAO (trilha nova), PROBLEMA (no catálogo) ou PERIGO (na trilha)
    tipo VARCHAR(50) NOT NULL,
    status ENUM('ATIVO', 'EM_VERIFICACAO', 'RESOLVIDO') NOT NULL DEFAULT 'ATIVO',
    mensagem VARCHAR(2000) NOT NULL,
    trilhaTexto VARCHAR(120),
    idTrilha BIGINT,
    idVisita BIGINT,
    idUsuario BIGINT NOT NULL,
    FOREIGN KEY (idTrilha) REFERENCES TRILHA(idTrilha) ON DELETE SET NULL,
    FOREIGN KEY (idVisita) REFERENCES VISITA(idVisita) ON DELETE SET NULL,
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE
);

CREATE TABLE FOTO (
    idFoto BIGINT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(500) NOT NULL,
    dataEnvio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    legenda VARCHAR(250),
    idVisita BIGINT NOT NULL,
    FOREIGN KEY (idVisita) REFERENCES VISITA(idVisita) ON DELETE CASCADE
);

CREATE TABLE SEGUIMENTO (
    idSeguimento BIGINT PRIMARY KEY AUTO_INCREMENT,
    idSeguidor BIGINT NOT NULL,
    idSeguido BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idSeguidor) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idSeguido) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    UNIQUE (idSeguidor, idSeguido)
);

CREATE TABLE BLOQUEIO (
    idBloqueio BIGINT PRIMARY KEY AUTO_INCREMENT,
    idBloqueador BIGINT NOT NULL,
    idBloqueado BIGINT NOT NULL,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idBloqueador) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idBloqueado) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    UNIQUE (idBloqueador, idBloqueado)
);

CREATE TABLE DENUNCIA (
    idDenuncia BIGINT PRIMARY KEY AUTO_INCREMENT,
    idDenunciante BIGINT NOT NULL,
    idDenunciado BIGINT NOT NULL,
    motivo ENUM('SPAM', 'ASSEDIO', 'CONTEUDO_IMPROPRIO', 'PERFIL_FALSO', 'OUTRO') NOT NULL,
    descricao VARCHAR(1000),
    status ENUM('ABERTA', 'ANALISADA') NOT NULL DEFAULT 'ABERTA',
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idDenunciante) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idDenunciado) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE
);

CREATE TABLE RECUPERACAO_SENHA (
    idRecuperacao BIGINT PRIMARY KEY AUTO_INCREMENT,
    idUsuario BIGINT NOT NULL,
    -- SHA-256 do token enviado por e-mail; o token em si não fica guardado
    tokenHash CHAR(64) NOT NULL UNIQUE,
    criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiraEm TIMESTAMP NOT NULL,
    usadoEm TIMESTAMP NULL,
    FOREIGN KEY (idUsuario) REFERENCES USUARIO(idUsuario) ON DELETE CASCADE
);
