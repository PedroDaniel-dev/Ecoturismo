package br.com.ecoturismo.convite;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConviteRepository extends JpaRepository<Convite, Long> {

    Optional<Convite> findByPartyIdAndDestinatarioId(Long partyId, Long destinatarioId);

    List<Convite> findByDestinatarioIdAndStatusNotOrderByCriadoEmDesc(Long destinatarioId, StatusConvite status);

    List<Convite> findByPartyIdAndStatusNotOrderByCriadoEmDesc(Long partyId, StatusConvite status);

    /**
     * Cancelados ficam de fora: o convite só é cancelado quando um bloqueia o outro, e mostrar isso
     * revelaria o bloqueio.
     */
    default List<Convite> findRecebidos(Long usuarioId) {
        return findByDestinatarioIdAndStatusNotOrderByCriadoEmDesc(usuarioId, StatusConvite.CANCELADO);
    }

    default List<Convite> findDaParty(Long partyId) {
        return findByPartyIdAndStatusNotOrderByCriadoEmDesc(partyId, StatusConvite.CANCELADO);
    }

    /** Convites pendentes entre os dois, em qualquer direção (usado ao bloquear). */
    @Query("""
            select c from Convite c where c.status = br.com.ecoturismo.convite.StatusConvite.PENDENTE
            and ((c.remetenteId = :a and c.destinatarioId = :b) or (c.remetenteId = :b and c.destinatarioId = :a))""")
    List<Convite> findPendentesEntre(@Param("a") Long a, @Param("b") Long b);
}
