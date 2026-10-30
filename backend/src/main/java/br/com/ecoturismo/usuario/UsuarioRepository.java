package br.com.ecoturismo.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    default Optional<Usuario> findByEmail(String email) {
        return email == null ? Optional.empty() : findByEmailIgnoreCase(email.trim());
    }

    default boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }
}
