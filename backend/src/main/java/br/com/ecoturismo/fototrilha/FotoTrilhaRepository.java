package br.com.ecoturismo.fototrilha;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoTrilhaRepository extends JpaRepository<FotoTrilha, Long> {

    List<FotoTrilha> findByVisitaUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    List<FotoTrilha> findByVisitaTrilhaIdOrderByCriadoEmDesc(Long trilhaId);

    long countByVisitaUsuarioId(Long usuarioId);

    /** Fotos do usuário, mais recentes primeiro. */
    default List<FotoTrilha> findByUsuarioId(Long usuarioId) {
        return findByVisitaUsuarioIdOrderByCriadoEmDesc(usuarioId);
    }

    /** Fotos da trilha, mais recentes primeiro. */
    default List<FotoTrilha> findByTrilhaId(Long trilhaId) {
        return findByVisitaTrilhaIdOrderByCriadoEmDesc(trilhaId);
    }
}
