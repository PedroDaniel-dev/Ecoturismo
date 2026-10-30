package br.com.ecoturismo.seguidor;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeguimentoRepository extends JpaRepository<Seguimento, Long> {

    Optional<Seguimento> findBySeguidorIdAndSeguidoId(Long seguidorId, Long seguidoId);

    List<Seguimento> findBySeguidoId(Long seguidoId);

    List<Seguimento> findBySeguidorId(Long seguidorId);

    long countBySeguidoId(Long seguidoId);

    long countBySeguidorId(Long seguidorId);

    default Optional<Seguimento> findEntre(Long seguidorId, Long seguidoId) {
        return findBySeguidorIdAndSeguidoId(seguidorId, seguidoId);
    }

    /** Desfaz o seguir nas duas direções (usado ao bloquear). */
    default void removerEntre(Long a, Long b) {
        findEntre(a, b).ifPresent(this::delete);
        findEntre(b, a).ifPresent(this::delete);
    }
}
