package br.com.ecoturismo.recuperacaosenha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6, max = 100) String novaSenha
) {}
