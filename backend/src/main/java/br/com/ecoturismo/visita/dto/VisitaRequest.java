package br.com.ecoturismo.visita.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record VisitaRequest(@NotNull Long trilhaId, @NotNull LocalDate data) {}
