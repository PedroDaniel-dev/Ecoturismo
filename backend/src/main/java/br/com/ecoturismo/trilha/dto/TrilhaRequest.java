package br.com.ecoturismo.trilha.dto;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import br.com.ecoturismo.trilha.Dificuldade;
import br.com.ecoturismo.trilha.SituacaoTrilha;
import br.com.ecoturismo.trilha.TipoAtividade;
import br.com.ecoturismo.trilha.TipoPercurso;
import br.com.ecoturismo.trilha.Zona;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Cadastro/edição de trilha pelo ADMIN. Horários vazios = 24 horas. */
public record TrilhaRequest(
        @NotBlank @Size(max = 100) String nome,
        @NotBlank @Size(max = 150) String localizacao,
        @Size(max = 150) String parque,
        @NotNull Zona zona,
        @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        @PositiveOrZero BigDecimal taxa,
        LocalTime horarioAbertura,
        LocalTime horarioFechamento,
        @Size(max = 250) String observacaoHorario,
        @NotNull Dificuldade dificuldade,
        @PositiveOrZero BigDecimal distancia,
        @PositiveOrZero Integer duracaoMinutos,
        @PositiveOrZero Integer altitude,
        @NotNull TipoPercurso tipoPercurso,
        @NotNull TipoAtividade tipoAtividade,
        SituacaoTrilha situacao,
        @NotBlank @Size(max = 250) String descricaoCurta,
        String descricao,
        @Size(max = 500) String comoChegar,
        @Valid List<ImagemDto> imagens,
        boolean destaque
) {}
