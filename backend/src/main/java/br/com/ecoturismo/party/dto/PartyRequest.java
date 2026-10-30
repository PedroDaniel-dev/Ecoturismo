package br.com.ecoturismo.party.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PartyRequest(
        @NotBlank @Size(max = 80) String nome,
        @Size(max = 250) String descricao,
        @NotNull Long trilhaId,
        @NotNull @FutureOrPresent LocalDate data,
        @NotNull LocalTime horario
) {}
