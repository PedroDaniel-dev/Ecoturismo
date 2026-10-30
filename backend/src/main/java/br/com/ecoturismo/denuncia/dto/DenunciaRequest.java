package br.com.ecoturismo.denuncia.dto;

import br.com.ecoturismo.denuncia.MotivoDenuncia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DenunciaRequest(@NotNull MotivoDenuncia motivo, @Size(max = 1000) String descricao) {}
