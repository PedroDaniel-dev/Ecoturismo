package br.com.ecoturismo.usuario;

import java.util.Locale;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Os e-mails são gravados em minúsculas, então as buscas comparam direto com a coluna (que tem índice UNIQUE).
 * Comparar com upper(email) obrigaria o MySQL a ler a tabela inteira.
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /** Só o necessário para validar o token JWT, sem carregar as curtidas. */
    interface Credenciais {
        Long getId();
        String getEmail();
        Role getRole();
        int getVersaoToken();
    }

    @Query("select u from Usuario u where u.email = :email")
    Optional<Usuario> buscarPorEmailNormalizado(@Param("email") String email);

    @Query("select u.id as id, u.email as email, u.role as role, u.versaoToken as versaoToken from Usuario u where u.email = :email")
    Optional<Credenciais> buscarCredenciais(@Param("email") String email);

    @Query("select u.id from Usuario u where u.email = :email")
    Optional<Long> buscarId(@Param("email") String email);

    static String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    default Optional<Usuario> findByEmail(String email) {
        return email == null ? Optional.empty() : buscarPorEmailNormalizado(normalizarEmail(email));
    }

    default Optional<Credenciais> findCredenciaisByEmail(String email) {
        return email == null ? Optional.empty() : buscarCredenciais(normalizarEmail(email));
    }

    default Optional<Long> findIdByEmail(String email) {
        return email == null ? Optional.empty() : buscarId(normalizarEmail(email));
    }

    default boolean existsByEmail(String email) {
        return findIdByEmail(email).isPresent();
    }
}
