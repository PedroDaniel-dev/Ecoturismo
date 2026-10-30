package br.com.ecoturismo.party;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartyRepository extends JpaRepository<Party, Long> {

    @Query("select p from Party p join p.membros m where m = :usuarioId order by p.data")
    List<Party> findByMembro(@Param("usuarioId") Long usuarioId);

    long countByLiderId(Long liderId);
}
