package br.com.ecoturismo.feed;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.ecoturismo.bloqueio.BloqueioRepository;
import br.com.ecoturismo.seguidor.SeguimentoService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.StatusVisita;
import br.com.ecoturismo.visita.Visita;
import br.com.ecoturismo.visita.VisitaRepository;

/** Feed: visitas concluídas dos amigos (quem se segue mutuamente), das mais recentes para as mais antigas. */
@Service
@Transactional(readOnly = true)
public class FeedService {

    public static final int TAMANHO_MAX = 50;

    private final UsuarioService usuarioService;
    private final SeguimentoService seguimentoService;
    private final VisitaRepository visitaRepository;
    private final BloqueioRepository bloqueioRepository;

    public FeedService(UsuarioService usuarioService, SeguimentoService seguimentoService,
                       VisitaRepository visitaRepository, BloqueioRepository bloqueioRepository) {
        this.usuarioService = usuarioService;
        this.seguimentoService = seguimentoService;
        this.visitaRepository = visitaRepository;
        this.bloqueioRepository = bloqueioRepository;
    }

    /** Página do feed; pagina começa em 0 e tamanho fica entre 1 e TAMANHO_MAX. */
    public List<Visita> doUsuario(String email, int pagina, int tamanho) {
        Usuario eu = usuarioService.buscarPorEmail(email);
        // bloquear já desfaz a amizade; o filtro é só uma garantia a mais
        Set<Long> ocultos = bloqueioRepository.idsComBloqueio(eu.getId());
        Set<Long> amigos = seguimentoService.amigos(eu.getId()).stream()
                .map(Usuario::getId)
                .filter(id -> !ocultos.contains(id))
                .collect(Collectors.toSet());

        int porPagina = Math.min(Math.max(tamanho, 1), TAMANHO_MAX);
        if (amigos.isEmpty()) return List.of();
        return visitaRepository.findByUsuarioIdInAndStatus(amigos, StatusVisita.CONCLUIDA).stream()
                .sorted(Visita.RECENTES)
                .skip((long) Math.max(pagina, 0) * porPagina)
                .limit(porPagina)
                .toList();
    }
}
