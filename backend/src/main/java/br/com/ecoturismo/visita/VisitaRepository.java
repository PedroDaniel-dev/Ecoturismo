package br.com.ecoturismo.visita;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaRepository extends JpaRepository<Visita, Long> {

    List<Visita> findByUsuarioId(Long usuarioId);

    List<Visita> findByUsuarioIdAndTrilhaId(Long usuarioId, Long trilhaId);

    List<Visita> findByTrilhaIdAndStatus(Long trilhaId, StatusVisita status);

    List<Visita> findByUsuarioIdInAndStatus(Collection<Long> usuarioIds, StatusVisita status);

    boolean existsByUsuarioIdAndTrilhaIdAndData(Long usuarioId, Long trilhaId, LocalDate data);
}
