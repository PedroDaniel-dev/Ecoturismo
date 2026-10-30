package br.com.ecoturismo.usuario.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import br.com.ecoturismo.usuario.Usuario;

/** Dados do próprio usuário logado (inclui e-mail, nascimento e telefone; para os outros use UsuarioResumo). */
public record UsuarioResponse(Long id, String nome, String email, String fotoUrl, String bio, String role,
                              LocalDate dataNascimento, String telefone, Set<Long> trilhasCurtidas, LocalDateTime criadoEm) {

    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getFotoUrl(), u.getBio(), u.getRole().name(),
                u.getDataNascimento(), u.getTelefone(), Set.copyOf(u.getTrilhasCurtidas()), u.getCriadoEm());
    }
}
