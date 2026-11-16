package br.com.ecoturismo.trilha;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TrilhaRepository extends JpaRepository<Trilha, Long> {

    /** Trilhas com as imagens numa consulta só (sem o JOIN, o Hibernate faz uma consulta de imagens por trilha). */
    @Query("select distinct t from Trilha t left join fetch t.imagens")
    List<Trilha> findAllComImagens();

    List<Trilha> findByDestaqueTrueOrderByNome();

    Optional<Trilha> findFirstByNome(String nome);
}
