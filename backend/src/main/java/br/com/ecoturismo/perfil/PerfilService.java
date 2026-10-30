package br.com.ecoturismo.perfil;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.bloqueio.BloqueioService;
import br.com.ecoturismo.fototrilha.FotoTrilha;
import br.com.ecoturismo.fototrilha.FotoTrilhaService;
import br.com.ecoturismo.party.PartyRepository;
import br.com.ecoturismo.perfil.dto.PerfilResponse;
import br.com.ecoturismo.seguidor.SeguimentoService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.StatusVisita;
import br.com.ecoturismo.visita.Visita;
import br.com.ecoturismo.visita.VisitaRepository;

/**
 * Junta o que aparece no perfil de um usuário. Avaliações são as visitas concluídas que receberam nota.
 * Quem foi bloqueado não vê o perfil de quem bloqueou (recebe 404, como se não existisse).
 */
@Service
@Transactional
public class PerfilService {

    private final UsuarioService usuarioService;
    private final VisitaRepository visitaRepository;
    private final PartyRepository partyRepository;
    private final SeguimentoService seguimentoService;
    private final BloqueioService bloqueioService;
    private final FotoTrilhaService fotoTrilhaService;

    public PerfilService(UsuarioService usuarioService, VisitaRepository visitaRepository, PartyRepository partyRepository,
                         SeguimentoService seguimentoService, BloqueioService bloqueioService, FotoTrilhaService fotoTrilhaService) {
        this.usuarioService = usuarioService;
        this.visitaRepository = visitaRepository;
        this.partyRepository = partyRepository;
        this.seguimentoService = seguimentoService;
        this.bloqueioService = bloqueioService;
        this.fotoTrilhaService = fotoTrilhaService;
    }

    public PerfilResponse perfil(String emailLogado, Long id) {
        Usuario eu = usuarioService.buscarPorEmail(emailLogado);
        Usuario u = visivelPara(eu, id);
        List<Visita> concluidas = concluidas(u.getId());
        LocalDateTime membroDesde = u.getCriadoEm();
        return new PerfilResponse(
                u.getId(), u.getNome(), u.getFotoUrl(), u.getBio(), membroDesde,
                concluidas.stream().filter(v -> v.getAvaliacao() != null).count(),
                concluidas.size(),
                partyRepository.countByLiderId(u.getId()),
                seguimentoService.contarSeguidores(u.getId()),
                seguimentoService.contarSeguindo(u.getId()),
                seguimentoService.contarAmigos(u.getId()),
                fotoTrilhaService.contarDoUsuario(u.getId()),
                eu.getId().equals(u.getId()),
                seguimentoService.segue(eu.getId(), u.getId()),
                seguimentoService.segue(u.getId(), eu.getId()),
                bloqueioService.bloqueou(eu.getId(), u.getId()));
    }

    public List<Visita> avaliacoes(String emailLogado, Long id) {
        Usuario u = visivelPara(usuarioService.buscarPorEmail(emailLogado), id);
        return concluidas(u.getId()).stream().filter(v -> v.getAvaliacao() != null).toList();
    }

    /** O próprio usuário vê também as planejadas e canceladas; os outros, só as concluídas. */
    public List<Visita> visitas(String emailLogado, Long id) {
        Usuario eu = usuarioService.buscarPorEmail(emailLogado);
        Usuario u = visivelPara(eu, id);
        if (eu.getId().equals(u.getId())) {
            return visitaRepository.findByUsuarioId(u.getId()).stream().sorted(Visita.RECENTES).toList();
        }
        return concluidas(u.getId());
    }

    public List<FotoTrilha> fotos(String emailLogado, Long id) {
        Usuario u = visivelPara(usuarioService.buscarPorEmail(emailLogado), id);
        return fotoTrilhaService.doUsuario(u.getId());
    }

    private Usuario visivelPara(Usuario eu, Long id) {
        Usuario u = usuarioService.buscarPorId(id);
        if (bloqueioService.bloqueou(u.getId(), eu.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado");
        }
        return u;
    }

    private List<Visita> concluidas(Long usuarioId) {
        return visitaRepository.findByUsuarioId(usuarioId).stream()
                .filter(v -> v.getStatus() == StatusVisita.CONCLUIDA)
                .sorted(Visita.RECENTES)
                .toList();
    }
}
