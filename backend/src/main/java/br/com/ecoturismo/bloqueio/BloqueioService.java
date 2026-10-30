package br.com.ecoturismo.bloqueio;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.convite.ConviteRepository;
import br.com.ecoturismo.convite.StatusConvite;
import br.com.ecoturismo.seguidor.SeguimentoRepository;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;

/**
 * Bloquear vale para tudo: desfaz o seguir (e com isso a amizade) nos dois sentidos, cancela convites pendentes entre os dois
 * e, daí em diante, um some das listas, do feed, das visitas e das fotos que o outro vê (ver BloqueioRepository.idsComBloqueio).
 */
@Service
@Transactional
public class BloqueioService {

    private final BloqueioRepository repository;
    private final SeguimentoRepository seguimentoRepository;
    private final ConviteRepository conviteRepository;
    private final UsuarioService usuarioService;

    public BloqueioService(BloqueioRepository repository, SeguimentoRepository seguimentoRepository,
                           ConviteRepository conviteRepository, UsuarioService usuarioService) {
        this.repository = repository;
        this.seguimentoRepository = seguimentoRepository;
        this.conviteRepository = conviteRepository;
        this.usuarioService = usuarioService;
    }

    /** Bloqueia, desfaz o seguir nas duas direções e cancela convites pendentes entre os dois. Bloquear de novo não faz nada. */
    public void bloquear(String email, Long bloqueadoId) {
        Usuario eu = usuarioService.buscarPorEmail(email);
        Usuario alvo = usuarioService.buscarPorId(bloqueadoId);
        if (eu.getId().equals(alvo.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode bloquear a si mesmo");
        }
        if (repository.findEntre(eu.getId(), alvo.getId()).isEmpty()) {
            Bloqueio b = new Bloqueio();
            b.setBloqueadorId(eu.getId());
            b.setBloqueadoId(alvo.getId());
            repository.save(b);
        }
        seguimentoRepository.removerEntre(eu.getId(), alvo.getId());
        conviteRepository.findPendentesEntre(eu.getId(), alvo.getId()).forEach(c -> {
            c.setStatus(StatusConvite.CANCELADO);
            conviteRepository.save(c);
        });
    }

    /** Quem o usuário bloqueou, para ele poder desbloquear. */
    public List<Usuario> bloqueados(String email) {
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        return repository.findByBloqueadorId(meuId).stream()
                .map(b -> usuarioService.buscarPorId(b.getBloqueadoId()))
                .toList();
    }

    public void desbloquear(String email, Long bloqueadoId) {
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        repository.findEntre(meuId, bloqueadoId).ifPresent(b -> repository.deleteById(b.getId()));
    }

    public boolean bloqueou(Long bloqueadorId, Long bloqueadoId) {
        return repository.findEntre(bloqueadorId, bloqueadoId).isPresent();
    }
}
