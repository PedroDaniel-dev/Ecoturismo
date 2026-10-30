package br.com.ecoturismo.trilha;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TrilhaRepository extends JpaRepository<Trilha, Long> {

    List<Trilha> findByDestaqueTrueOrderByNome();

    Optional<Trilha> findFirstByNome(String nome);
}
