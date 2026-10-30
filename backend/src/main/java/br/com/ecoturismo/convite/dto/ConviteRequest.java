package br.com.ecoturismo.convite.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ConviteRequest(@NotNull Long partyId, @NotBlank @Email String email) {}
