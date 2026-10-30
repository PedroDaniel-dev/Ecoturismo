package br.com.ecoturismo.avisoperigo.dto;

import br.com.ecoturismo.avisoperigo.TipoAviso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Quem envia vem do login; trilhaId e visitaId são opcionais. */
public record AvisoRequest(
        @NotNull TipoAviso tipo,
        @NotBlank @Size(max = 120) String trilha,
        Long trilhaId,
        Long visitaId,
        @NotBlank @Size(max = 2000) String mensagem
) {}
