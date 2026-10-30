package br.com.ecoturismo.avisoperigo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvisoPerigoRepository extends JpaRepository<AvisoPerigo, Long> {

    List<AvisoPerigo> findByTrilhaIdAndTipoAndStatusNotOrderByCriadoEmDesc(Long trilhaId, TipoAviso tipo, StatusAviso status);

    List<AvisoPerigo> findAllByOrderByCriadoEmDesc();

    List<AvisoPerigo> findByTipoOrderByCriadoEmDesc(TipoAviso tipo);

    List<AvisoPerigo> findByTipoAndStatusOrderByCriadoEmDesc(TipoAviso tipo, StatusAviso status);

    /** Perigos ainda não resolvidos de uma trilha, para mostrar na página dela. */
    default List<AvisoPerigo> findAtivosByTrilhaId(Long trilhaId) {
        return findByTrilhaIdAndTipoAndStatusNotOrderByCriadoEmDesc(trilhaId, TipoAviso.PERIGO, StatusAviso.RESOLVIDO);
    }
}
