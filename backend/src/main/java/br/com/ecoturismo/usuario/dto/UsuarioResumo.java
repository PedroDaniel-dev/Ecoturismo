package br.com.ecoturismo.usuario.dto;

import br.com.ecoturismo.usuario.Usuario;

/** Dados públicos de um usuário, para mostrar a outras pessoas (sem e-mail). */
public record UsuarioResumo(Long id, String nome, String fotoUrl) {

    public static UsuarioResumo de(Usuario u) {
        return new UsuarioResumo(u.getId(), u.getNome(), u.getFotoUrl());
    }
}
