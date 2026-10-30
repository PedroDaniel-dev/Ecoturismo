package br.com.ecoturismo.convite;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConviteRepository extends JpaRepository<Convite, Long> {

    List<Convite> findByDestinatarioIdAndStatus(Long destinatarioId, StatusConvite status);

    Optional<Convite> findByPartyIdAndDestinatarioId(Long partyId, Long destinatarioId);

    default List<Convite> findPendentesByDestinatarioId(Long usuarioId) {
        return findByDestinatarioIdAndStatus(usuarioId, StatusConvite.PENDENTE);
    }

    /** Convites pendentes entre os dois, em qualquer direção (usado ao bloquear). */
    @Query("""
            select c from Convite c where c.status = br.com.ecoturismo.convite.StatusConvite.PENDENTE
            and ((c.remetenteId = :a and c.destinatarioId = :b) or (c.remetenteId = :b and c.destinatarioId = :a))""")
    List<Convite> findPendentesEntre(@Param("a") Long a, @Param("b") Long b);
}
