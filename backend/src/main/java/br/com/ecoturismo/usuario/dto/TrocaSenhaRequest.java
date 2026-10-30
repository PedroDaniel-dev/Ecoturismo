package br.com.ecoturismo.usuario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocaSenhaRequest(
        @NotBlank String senhaAtual,
        @NotBlank @Size(min = 6, max = 100) String novaSenha
) {}
