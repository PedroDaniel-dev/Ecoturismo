package br.com.ecoturismo.seguidor;

import java.util.List;
import java.util.Set;
import java.util.function.Function;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.bloqueio.BloqueioRepository;
import br.com.ecoturismo.seguidor.dto.SeguirResponse;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;

/**
 * Seguir é de mão única e não precisa de aceite. Quando os dois se seguem, viram amigos:
 * a amizade não é guardada à parte, sai dos dois seguimentos (e some quando um deixa de seguir ou bloqueia).
 */
@Service
@Transactional
public class SeguimentoService {

    private final SeguimentoRepository repository;
    private final BloqueioRepository bloqueioRepository;
    private final UsuarioService usuarioService;

    public SeguimentoService(SeguimentoRepository repository, BloqueioRepository bloqueioRepository, UsuarioService usuarioService) {
        this.repository = repository;
        this.bloqueioRepository = bloqueioRepository;
        this.usuarioService = usuarioService;
    }

    /** Começa a seguir. Seguir de novo quem já segue não faz nada. */
    public void seguir(String email, Long seguidoId) {
        Usuario eu = usuarioService.buscarPorEmail(email);
        Usuario alvo = usuarioService.buscarPorId(seguidoId);
        if (eu.getId().equals(alvo.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode seguir a si mesmo");
        }
        if (bloqueioRepository.existeEntre(eu.getId(), alvo.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Não é possível seguir este usuário");
        }
        if (repository.findEntre(eu.getId(), alvo.getId()).isPresent()) return;

        Seguimento s = new Seguimento();
        s.setSeguidorId(eu.getId());
        s.setSeguidoId(alvo.getId());
        repository.save(s);
    }

    public void deixarDeSeguir(String email, Long seguidoId) {
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        repository.findEntre(meuId, seguidoId).ifPresent(s -> repository.deleteById(s.getId()));
    }

    public boolean segue(Long seguidorId, Long seguidoId) {
        return repository.findEntre(seguidorId, seguidoId).isPresent();
    }

    public boolean saoAmigos(Long a, Long b) {
        return segue(a, b) && segue(b, a);
    }

    /** Como fica a relação, vista por quem está logado, depois de seguir ou deixar de seguir. */
    public SeguirResponse estado(String email, Long outroId) {
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        return new SeguirResponse(segue(meuId, outroId), saoAmigos(meuId, outroId), contarSeguidores(outroId));
    }

    public long contarSeguidores(Long usuarioId) {
        return repository.findBySeguidoId(usuarioId).size();
    }

    public long contarSeguindo(Long usuarioId) {
        return repository.findBySeguidorId(usuarioId).size();
    }

    public long contarAmigos(Long usuarioId) {
        return repository.findBySeguidorId(usuarioId).stream()
                .filter(s -> segue(s.getSeguidoId(), usuarioId))
                .count();
    }

    /**
     * Uma lista de pessoas de um perfil (seguidores, seguindo, amigos), vista por quem está logado.
     * Se o dono do perfil bloqueou quem pede, responde 404 como o perfil; quem tem bloqueio com quem pede some da lista.
     */
    public List<Usuario> listaVisivel(String email, Long donoId, Function<Long, List<Usuario>> lista) {
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        usuarioService.buscarPorId(donoId);
        if (bloqueioRepository.findEntre(donoId, meuId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado");
        }
        Set<Long> ocultos = bloqueioRepository.idsComBloqueio(meuId);
        return lista.apply(donoId).stream().filter(u -> !ocultos.contains(u.getId())).toList();
    }

    public List<Usuario> seguidores(Long usuarioId) {
        return repository.findBySeguidoId(usuarioId).stream()
                .map(s -> usuarioService.buscarPorId(s.getSeguidorId()))
                .toList();
    }

    public List<Usuario> seguindo(Long usuarioId) {
        return repository.findBySeguidorId(usuarioId).stream()
                .map(s -> usuarioService.buscarPorId(s.getSeguidoId()))
                .toList();
    }

    /** Quem o usuário segue e também o segue de volta. */
    public List<Usuario> amigos(Long usuarioId) {
        return repository.findBySeguidorId(usuarioId).stream()
                .filter(s -> segue(s.getSeguidoId(), usuarioId))
                .map(s -> usuarioService.buscarPorId(s.getSeguidoId()))
                .toList();
    }
}
