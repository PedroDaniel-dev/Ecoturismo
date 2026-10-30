package br.com.ecoturismo.visita.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/** Nota opcional, de 0,5 em 0,5 (meia estrela) até 5. */
public record ConcluirVisitaRequest(@DecimalMin("0.5") @DecimalMax("5.0") BigDecimal avaliacao, @Size(max = 250) String comentario) {}
