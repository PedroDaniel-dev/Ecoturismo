package br.com.ecoturismo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.ecoturismo.config.EnvioEmail;

/**
 * Sobe a aplicação inteira com H2 no modo MySQL e as mesmas migrações do Flyway (esquema + 46 trilhas)
 * e exercita a API como o frontend faz. Cada teste cria usuários próprios (e-mail aleatório) para não depender da ordem.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegracaoTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean EnvioEmail envioEmail;

    // ── utilitários ──

    private String corpo(Object o) throws Exception { return json.writeValueAsString(o); }

    private JsonNode ler(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder req, String token) {
        return req.header("Authorization", "Bearer " + token);
    }

    private ResultActions enviarJson(MockHttpServletRequestBuilder req, String token, Object body) throws Exception {
        if (token != null) req = comToken(req, token);
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(corpo(body)));
    }

    /** Cadastra um usuário novo e devolve { token, id, email }. */
    private Map<String, Object> cadastrar(String nome) throws Exception {
        String email = nome.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@teste.rio";
        JsonNode r = ler(enviarJson(post("/api/auth/register"), null,
                Map.of("nome", nome, "email", email, "senha", "segredo1", "dataNascimento", "1999-04-10"))
                .andExpect(status().isCreated()));
        return Map.of("token", r.get("token").asText(), "id", r.get("usuario").get("id").asLong(), "email", email);
    }

    private long idDaTrilha(String nome) throws Exception {
        for (JsonNode t : ler(mvc.perform(get("/api/trilhas")))) if (t.get("nome").asText().equals(nome)) return t.get("id").asLong();
        throw new AssertionError("trilha não encontrada: " + nome);
    }

    // ── catálogo ──

    @Test
    void catalogoVemDoBancoComFiltros() throws Exception {
        mvc.perform(get("/api/trilhas")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(46)));
        mvc.perform(get("/api/trilhas?zona=FORA_DO_RIO")).andExpect(jsonPath("$", hasSize(5)));
        mvc.perform(get("/api/trilhas?dificuldade=DIFICIL")).andExpect(jsonPath("$[*].nome", hasItem("Pedra da Gávea")));
        mvc.perform(get("/api/trilhas?q=tijuca&duracao=CURTA")).andExpect(jsonPath("$[*].nome", hasItem("Pico da Tijuca e Tijuca Mirim")));
        mvc.perform(get("/api/trilhas/destaques")).andExpect(jsonPath("$", hasSize(6)));

        long id = idDaTrilha("Morro Dois Irmãos");
        mvc.perform(get("/api/trilhas/" + id))
                .andExpect(jsonPath("$.taxa").value(20.0))
                .andExpect(jsonPath("$.dificuldadeLabel").value("Fácil"))
                .andExpect(jsonPath("$.imagens", hasSize(3)))
                .andExpect(jsonPath("$.horarioAbertura").doesNotExist());
        mvc.perform(get("/api/trilhas/" + idDaTrilha("Morro do Visconde"))).andExpect(jsonPath("$.situacao").value("MANUTENCAO"));
    }

    // ── cadastro, curtidas, avaliações ──

    @Test
    void cadastroExigeDataDeNascimento() throws Exception {
        enviarJson(post("/api/auth/register"), null, Map.of("nome", "Sem Data", "email", "semdata@teste.rio", "senha", "segredo1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void curtirEAvaliarComMeiaEstrela() throws Exception {
        var ana = cadastrar("Ana");
        String token = (String) ana.get("token");
        long trilha = idDaTrilha("Pedra do Pontal");

        mvc.perform(comToken(post("/api/trilhas/" + trilha + "/curtir"), token)).andExpect(jsonPath("$.curtida").value(true));
        mvc.perform(comToken(get("/api/usuarios/me"), token)).andExpect(jsonPath("$.trilhasCurtidas", hasItem((int) trilha)));

        var avaliacao = Map.of("trilhaId", trilha, "data", LocalDate.now().toString(), "avaliacao", 4.5, "comentario", "Vista linda do Recreio.");
        enviarJson(post("/api/visitas/concluida"), token, avaliacao).andExpect(status().isCreated());
        enviarJson(post("/api/visitas/concluida"), token, avaliacao).andExpect(status().isConflict());
        enviarJson(post("/api/visitas/concluida"), token,
                Map.of("trilhaId", trilha, "data", LocalDate.now().minusDays(1).toString(), "avaliacao", 4.3)).andExpect(status().isBadRequest());

        // avaliações são públicas
        mvc.perform(get("/api/trilhas/" + trilha + "/avaliacoes"))
                .andExpect(jsonPath("$[0].avaliacao").value(4.5))
                .andExpect(jsonPath("$[0].usuario.nome").value("Ana"));
    }

    @Test
    void fotoPrecisaDeUmaVisita() throws Exception {
        var bia = cadastrar("Bia");
        String token = (String) bia.get("token");
        long trilha = idDaTrilha("Mirante do Caeté");
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0};
        var arquivo = new MockMultipartFile("arquivo", "foto.png", "image/png", png);

        mvc.perform(comToken(multipart("/api/trilhas/" + trilha + "/fotos").file(arquivo), token)).andExpect(status().isBadRequest());

        enviarJson(post("/api/visitas"), token, Map.of("trilhaId", trilha, "data", LocalDate.now().plusDays(3).toString()))
                .andExpect(status().isCreated());
        mvc.perform(comToken(multipart("/api/trilhas/" + trilha + "/fotos").file(arquivo).param("legenda", "Prainha lá embaixo"), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trilhaId").value(trilha))
                .andExpect(jsonPath("$.usuarioId").value(bia.get("id")));
    }

    // ── amizade, feed, bloqueio ──

    @Test
    void seguirMutuoViraAmizadeEFeed() throws Exception {
        var caio = cadastrar("Caio");
        var duda = cadastrar("Duda");
        String tCaio = (String) caio.get("token"), tDuda = (String) duda.get("token");

        mvc.perform(comToken(post("/api/usuarios/" + duda.get("id") + "/seguir"), tCaio)).andExpect(jsonPath("$.amigos").value(false));
        mvc.perform(comToken(post("/api/usuarios/" + caio.get("id") + "/seguir"), tDuda)).andExpect(jsonPath("$.amigos").value(true));
        mvc.perform(comToken(get("/api/usuarios/" + caio.get("id") + "/amigos"), tCaio)).andExpect(jsonPath("$[0].nome").value("Duda"));

        enviarJson(post("/api/visitas/concluida"), tDuda,
                Map.of("trilhaId", idDaTrilha("Morro da Urca"), "data", "2026-01-10", "avaliacao", 5)).andExpect(status().isCreated());
        mvc.perform(comToken(get("/api/feed"), tCaio)).andExpect(jsonPath("$[0].usuario.nome").value("Duda"));

        // bloquear desfaz a amizade e esconde as avaliações de um para o outro
        mvc.perform(comToken(post("/api/usuarios/" + duda.get("id") + "/bloquear"), tCaio)).andExpect(status().isNoContent());
        mvc.perform(comToken(get("/api/feed"), tCaio)).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(comToken(get("/api/trilhas/" + idDaTrilha("Morro da Urca") + "/avaliacoes"), tCaio))
                .andExpect(jsonPath("$[*].usuario.nome", not(hasItem("Duda"))));
        mvc.perform(comToken(get("/api/usuarios/" + caio.get("id") + "/perfil"), tDuda)).andExpect(status().isNotFound());
        mvc.perform(comToken(get("/api/usuarios/me/bloqueados"), tCaio)).andExpect(jsonPath("$[0].nome").value("Duda"));
    }

    // ── senha ──

    @Test
    void trocarSenhaDerrubaTokensAntigos() throws Exception {
        var edu = cadastrar("Edu");
        String antigo = (String) edu.get("token");
        JsonNode r = ler(enviarJson(put("/api/usuarios/me/senha"), antigo, Map.of("senhaAtual", "segredo1", "novaSenha", "outra-senha"))
                .andExpect(status().isOk()));
        mvc.perform(comToken(get("/api/usuarios/me"), antigo)).andExpect(status().isUnauthorized());
        mvc.perform(comToken(get("/api/usuarios/me"), r.get("token").asText())).andExpect(status().isOk());
        enviarJson(put("/api/usuarios/me/senha"), r.get("token").asText(), Map.of("senhaAtual", "errada", "novaSenha", "mais-uma"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recuperarSenhaPeloLinkDoEmail() throws Exception {
        var fe = cadastrar("Fe");
        String email = (String) fe.get("email");

        enviarJson(post("/api/auth/esqueci-senha"), null, Map.of("email", email)).andExpect(status().isNoContent());
        // e-mail que não existe responde igual
        enviarJson(post("/api/auth/esqueci-senha"), null, Map.of("email", "ninguem@teste.rio")).andExpect(status().isNoContent());

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(envioEmail).enviar(eq(email), anyString(), texto.capture());
        Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(texto.getValue());
        assertThat(m.find()).isTrue();
        String token = m.group(1);

        enviarJson(post("/api/auth/redefinir-senha"), null, Map.of("token", token, "novaSenha", "senha-nova")).andExpect(status().isNoContent());
        enviarJson(post("/api/auth/redefinir-senha"), null, Map.of("token", token, "novaSenha", "de-novo")).andExpect(status().isBadRequest());
        enviarJson(post("/api/auth/login"), null, Map.of("email", email, "senha", "senha-nova")).andExpect(status().isOk());
        mvc.perform(comToken(get("/api/usuarios/me"), (String) fe.get("token"))).andExpect(status().isUnauthorized());
    }

    // ── avisos, parties, convites ──

    @Test
    void avisoExigeLogin() throws Exception {
        var aviso = Map.of("tipo", "PERIGO", "trilha", "Pedra da Gávea", "trilhaId", idDaTrilha("Pedra da Gávea"), "mensagem", "Árvore caída no meio da trilha.");
        enviarJson(post("/api/avisos"), null, aviso).andExpect(status().isUnauthorized());
        var gil = cadastrar("Gil");
        enviarJson(post("/api/avisos"), (String) gil.get("token"), aviso).andExpect(status().isCreated());
        mvc.perform(get("/api/avisos/trilha/" + idDaTrilha("Pedra da Gávea"))).andExpect(jsonPath("$[0].autor.nome").value("Gil"));
    }

    @Test
    void partyComHorarioEConviteReaproveitado() throws Exception {
        var hugo = cadastrar("Hugo");
        var iris = cadastrar("Iris");
        String tHugo = (String) hugo.get("token"), tIris = (String) iris.get("token");

        JsonNode party = ler(enviarJson(post("/api/parties"), tHugo, Map.of("nome", "Caeté cedinho", "trilhaId", idDaTrilha("Mirante do Caeté"),
                "data", LocalDate.now().plusDays(7).toString(), "horario", "07:30")).andExpect(status().isCreated()));
        assertThat(party.get("horario").asText()).isEqualTo("07:30:00");

        var convite = Map.of("partyId", party.get("id").asLong(), "email", iris.get("email"));
        long id1 = ler(enviarJson(post("/api/convites"), tHugo, convite).andExpect(status().isCreated())).get("id").asLong();
        mvc.perform(comToken(patch("/api/convites/" + id1 + "/recusar"), tIris)).andExpect(jsonPath("$.status").value("RECUSADO"));
        long id2 = ler(enviarJson(post("/api/convites"), tHugo, convite).andExpect(status().isCreated())).get("id").asLong();
        assertThat(id2).isEqualTo(id1);
        mvc.perform(comToken(patch("/api/convites/" + id2 + "/aceitar"), tIris)).andExpect(jsonPath("$.status").value("ACEITO"));
        mvc.perform(comToken(get("/api/parties/" + party.get("id").asLong()), tIris))
                .andExpect(jsonPath("$.membros", hasSize(2)))
                .andExpect(jsonPath("$.lider.nome").value("Hugo"));
        mvc.perform(comToken(delete("/api/parties/" + party.get("id").asLong()), tHugo)).andExpect(status().isNoContent());
    }

    @Test
    void lideresEditamEConvidamAmigosPeloId() throws Exception {
        var jade = cadastrar("Jade");
        var kai = cadastrar("Kai");
        String tJade = (String) jade.get("token"), tKai = (String) kai.get("token");
        var dados = Map.of("nome", "Urca ao amanhecer", "trilhaId", idDaTrilha("Morro da Urca"),
                "data", LocalDate.now().plusDays(3).toString(), "horario", "05:30");
        long party = ler(enviarJson(post("/api/parties"), tJade, dados).andExpect(status().isCreated())).get("id").asLong();

        enviarJson(post("/api/convites"), tJade, Map.of("partyId", party)).andExpect(status().isBadRequest());
        long convite = ler(enviarJson(post("/api/convites"), tJade, Map.of("partyId", party, "usuarioId", kai.get("id")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.party.nome").value("Urca ao amanhecer"))
                .andExpect(jsonPath("$.remetente.nome").value("Jade"))).get("id").asLong();
        mvc.perform(comToken(get("/api/convites/party/" + party), tJade)).andExpect(jsonPath("$[0].convidado.nome").value("Kai"));
        mvc.perform(comToken(get("/api/convites/party/" + party), tKai)).andExpect(status().isForbidden());

        mvc.perform(comToken(patch("/api/convites/" + convite + "/aceitar"), tKai));
        // respondidos continuam na lista de recebidos
        mvc.perform(comToken(get("/api/convites/recebidos"), tKai)).andExpect(jsonPath("$[0].status").value("ACEITO"));

        var editado = Map.of("nome", "Urca + Pão de Açúcar", "trilhaId", idDaTrilha("Morro da Urca"),
                "data", LocalDate.now().plusDays(4).toString(), "horario", "06:00");
        enviarJson(put("/api/parties/" + party), tKai, editado).andExpect(status().isForbidden());
        enviarJson(put("/api/parties/" + party), tJade, editado)
                .andExpect(jsonPath("$.nome").value("Urca + Pão de Açúcar"))
                .andExpect(jsonPath("$.horario").value("06:00:00"))
                .andExpect(jsonPath("$.membros", hasSize(2)));
    }

    @Test
    void avisoPelaVisitaApareceNaListaPublica() throws Exception {
        var lia = cadastrar("Lia");
        String token = (String) lia.get("token");
        long trilha = idDaTrilha("Pedra Bonita");
        long visita = ler(enviarJson(post("/api/visitas/concluida"), token,
                Map.of("trilhaId", trilha, "data", LocalDate.now().minusDays(1).toString(), "avaliacao", 4))).get("id").asLong();

        var outraTrilha = Map.of("tipo", "PERIGO", "trilha", "Pedra da Gávea", "trilhaId", idDaTrilha("Pedra da Gávea"),
                "visitaId", visita, "mensagem", "Abelhas no mirante.");
        enviarJson(post("/api/avisos"), token, outraTrilha).andExpect(status().isBadRequest());

        long aviso = ler(enviarJson(post("/api/avisos"), token, Map.of("tipo", "PERIGO", "trilha", "Pedra Bonita",
                "visitaId", visita, "mensagem", "Enxame de abelhas na rampa de voo.")).andExpect(status().isCreated()))
                .get("id").asLong();
        mvc.perform(get("/api/avisos/perigos?status=ATIVO"))
                .andExpect(jsonPath("$[0].id").value((int) aviso))
                .andExpect(jsonPath("$[0].trilhaId").value((int) trilha))
                .andExpect(jsonPath("$[*].tipo", not(hasItem("SUGESTAO"))));
        mvc.perform(get("/api/avisos/perigos?status=RESOLVIDO")).andExpect(jsonPath("$[*].id", not(hasItem((int) aviso))));
    }

    // ── dados de teste ──

    @Test
    void contasDeTesteExistem() throws Exception {
        JsonNode r = ler(enviarJson(post("/api/auth/login"), null, Map.of("email", "pedrodanielcf@gmail.com", "senha", "senha1234"))
                .andExpect(status().isOk()));
        String token = r.get("token").asText();
        long pedro = r.get("usuario").get("id").asLong();
        mvc.perform(comToken(get("/api/usuarios/" + pedro + "/perfil"), token))
                .andExpect(jsonPath("$.amigos").value(1))
                .andExpect(jsonPath("$.seguidores").value(2));
        mvc.perform(get("/api/trilhas/" + idDaTrilha("Morro Dois Irmãos") + "/avaliacoes")).andExpect(jsonPath("$[0].avaliacao").value(4.5));
    }
}
