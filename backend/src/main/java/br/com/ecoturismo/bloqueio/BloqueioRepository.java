package br.com.ecoturismo.bloqueio;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BloqueioRepository extends JpaRepository<Bloqueio, Long> {

    Optional<Bloqueio> findByBloqueadorIdAndBloqueadoId(Long bloqueadorId, Long bloqueadoId);

    List<Bloqueio> findByBloqueadorId(Long bloqueadorId);

    List<Bloqueio> findByBloqueadoId(Long bloqueadoId);

    default Optional<Bloqueio> findEntre(Long bloqueadorId, Long bloqueadoId) {
        return findByBloqueadorIdAndBloqueadoId(bloqueadorId, bloqueadoId);
    }

    /** Algum dos dois bloqueou o outro. */
    default boolean existeEntre(Long a, Long b) {
        return findEntre(a, b).isPresent() || findEntre(b, a).isPresent();
    }

    /** Quem tem bloqueio com o usuário, em qualquer direção: um não vê o conteúdo do outro. */
    default Set<Long> idsComBloqueio(Long usuarioId) {
        Set<Long> ids = new HashSet<>();
        findByBloqueadorId(usuarioId).forEach(b -> ids.add(b.getBloqueadoId()));
        findByBloqueadoId(usuarioId).forEach(b -> ids.add(b.getBloqueadorId()));
        return ids;
    }
}
