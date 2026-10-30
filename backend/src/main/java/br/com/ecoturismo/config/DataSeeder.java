package br.com.ecoturismo.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.ecoturismo.party.Party;
import br.com.ecoturismo.party.PartyRepository;
import br.com.ecoturismo.seguidor.Seguimento;
import br.com.ecoturismo.seguidor.SeguimentoRepository;
import br.com.ecoturismo.trilha.Trilha;
import br.com.ecoturismo.trilha.TrilhaRepository;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioRepository;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.StatusVisita;
import br.com.ecoturismo.visita.Visita;
import br.com.ecoturismo.visita.VisitaRepository;

/**
 * Cria, se ainda não existirem, o admin e as contas de teste (Pedro, Marina e Lucas). As trilhas não vêm daqui:
 * estão no banco, carregadas pelo Flyway (db/migration/V2__trilhas.sql). Senhas precisam de BCrypt, por isso
 * os usuários são criados em Java e não em SQL. Para não criar as contas de teste, deixe app.teste.email vazio.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final TrilhaRepository trilhaRepository;
    private final VisitaRepository visitaRepository;
    private final PartyRepository partyRepository;
    private final SeguimentoRepository seguimentoRepository;
    private final String adminEmail;
    private final String adminSenha;
    private final String testeEmail;
    private final String testeSenha;

    public DataSeeder(UsuarioService usuarioService, UsuarioRepository usuarioRepository, TrilhaRepository trilhaRepository,
                      VisitaRepository visitaRepository, PartyRepository partyRepository, SeguimentoRepository seguimentoRepository,
                      @Value("${app.admin.email}") String adminEmail,
                      @Value("${app.admin.senha}") String adminSenha,
                      @Value("${app.teste.email:}") String testeEmail,
                      @Value("${app.teste.senha:}") String testeSenha) {
        this.usuarioService = usuarioService;
        this.usuarioRepository = usuarioRepository;
        this.trilhaRepository = trilhaRepository;
        this.visitaRepository = visitaRepository;
        this.partyRepository = partyRepository;
        this.seguimentoRepository = seguimentoRepository;
        this.adminEmail = adminEmail;
        this.adminSenha = adminSenha;
        this.testeEmail = testeEmail;
        this.testeSenha = testeSenha;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // data de nascimento é obrigatória no banco; as das contas de teste são fictícias
        usuarioService.criarAdminSeNaoExistir(adminEmail, adminSenha, LocalDate.of(1990, 1, 1));
        if (!testeEmail.isBlank()) criarPerfisDeTeste();
    }

    /**
     * Pedro (conta provisória) com perfil preenchido, Marina (os dois se seguem, então são amigos)
     * e Lucas (segue o Pedro, mas não é seguido de volta). As trilhas são achadas pelo nome.
     */
    private void criarPerfisDeTeste() {
        Usuario pedro = usuarioService.criarUsuarioSeNaoExistir("Pedro", testeEmail, testeSenha, LocalDate.of(1998, 5, 12));
        if (!visitaRepository.findByUsuarioId(pedro.getId()).isEmpty()) return;

        pedro.setBio("Trilheiro de fim de semana, sempre atrás de um mirante novo no Rio.");
        pedro.setCriadoEm(LocalDateTime.of(2024, 1, 15, 10, 0));
        usuarioRepository.save(pedro);

        visita(pedro, "Pedra Bonita", LocalDate.of(2024, 3, 10), "5", "Subida curta e vista absurda da Pedra da Gávea. Fui no fim da tarde e peguei o pôr do sol na rampa.");
        visita(pedro, "Morro Dois Irmãos", LocalDate.of(2024, 6, 22), "4.5", "Trilha bem cuidada pelos guias do Vidigal. Vá cedo: o sol bate forte no trecho final.");
        visita(pedro, "Pico da Tijuca e Tijuca Mirim", LocalDate.of(2025, 8, 3), "5", "A escadaria na rocha no fim compensa o esforço. Leve casaco, venta muito no topo.");
        visita(pedro, "Morro da Urca", LocalDate.of(2025, 11, 16), null, null);
        Visita planejada = new Visita();
        planejada.setUsuarioId(pedro.getId());
        planejada.setTrilhaId(trilha("Pedra da Gávea").getId());
        planejada.setData(LocalDate.now().plusDays(10));
        visitaRepository.save(planejada);

        Usuario marina = usuarioService.criarUsuarioSeNaoExistir("Marina Souza", "marina@ecoturismo.rio", testeSenha, LocalDate.of(1995, 9, 2));
        marina.setBio("Fotógrafa de natureza. Cachoeira é comigo mesmo.");
        marina.setCriadoEm(LocalDateTime.of(2023, 9, 2, 9, 0));
        usuarioRepository.save(marina);
        visita(marina, "Cachoeira dos Primatas", LocalDate.of(2025, 12, 7), "4", "Água geladíssima e quase ninguém às 8h. A trilha até lá é curtinha e sombreada.");

        Usuario lucas = usuarioService.criarUsuarioSeNaoExistir("Lucas Andrade", "lucas@ecoturismo.rio", testeSenha, LocalDate.of(1993, 2, 20));
        lucas.setBio("Corredor de montanha. Treino no Pico da Tijuca quase todo fim de semana.");
        lucas.setCriadoEm(LocalDateTime.of(2025, 2, 20, 18, 0));
        usuarioRepository.save(lucas);
        visita(lucas, "Pico da Tijuca e Tijuca Mirim", LocalDate.of(2026, 1, 11), "5", "Subi correndo pela Estrada dos Picos. Os últimos degraus na rocha cobram o preço.");

        seguir(marina, pedro);
        seguir(pedro, marina);
        seguir(lucas, pedro);

        Party party = new Party();
        party.setNome("Gávea no sábado");
        party.setDescricao("Saída às 6h da Estrada Sorimã. Precisa de experiência na Carrasqueira.");
        party.setTrilhaId(planejada.getTrilhaId());
        party.setData(planejada.getData());
        party.setHorario(LocalTime.of(6, 0));
        party.setLiderId(pedro.getId());
        party.getMembros().add(pedro.getId());
        party.getMembros().add(marina.getId());
        partyRepository.save(party);
    }

    private Trilha trilha(String nome) {
        return trilhaRepository.findFirstByNome(nome)
                .orElseThrow(() -> new IllegalStateException("Trilha '" + nome + "' não está no banco (veja V2__trilhas.sql)"));
    }

    private void seguir(Usuario seguidor, Usuario seguido) {
        Seguimento s = new Seguimento();
        s.setSeguidorId(seguidor.getId());
        s.setSeguidoId(seguido.getId());
        seguimentoRepository.save(s);
    }

    private void visita(Usuario u, String trilha, LocalDate data, String nota, String comentario) {
        Visita v = new Visita();
        v.setUsuarioId(u.getId());
        v.setTrilhaId(trilha(trilha).getId());
        v.setData(data);
        v.setStatus(StatusVisita.CONCLUIDA);
        v.setAvaliacao(nota == null ? null : new BigDecimal(nota));
        v.setComentario(comentario);
        visitaRepository.save(v);
    }
}
