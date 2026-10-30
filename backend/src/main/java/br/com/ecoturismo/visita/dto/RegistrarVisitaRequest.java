package br.com.ecoturismo.visita.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/** Visita já feita, registrada de uma vez com a avaliação (ex.: o formulário de avaliação na página da trilha). */
public record RegistrarVisitaRequest(
        @NotNull Long trilhaId,
        @NotNull @PastOrPresent LocalDate data,
        @NotNull @DecimalMin("0.5") @DecimalMax("5.0") BigDecimal avaliacao,
        @Size(max = 250) String comentario
) {}
