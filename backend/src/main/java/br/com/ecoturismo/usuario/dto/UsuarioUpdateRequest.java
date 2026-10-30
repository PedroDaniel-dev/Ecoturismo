package br.com.ecoturismo.usuario.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

/** Campos ausentes (null) não mudam; texto vazio apaga bio, telefone ou foto. */
public record UsuarioUpdateRequest(
        @Size(min = 2, max = 100) String nome,
        @Size(max = 500) String fotoUrl,
        @Size(max = 250) String bio,
        @Size(max = 20) String telefone,
        @Past LocalDate dataNascimento
) {}
