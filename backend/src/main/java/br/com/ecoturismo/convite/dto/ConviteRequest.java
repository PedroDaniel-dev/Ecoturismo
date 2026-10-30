package br.com.ecoturismo.convite.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

/** Convida pelo e-mail ou pelo id do usuário (amigos: a tela não conhece o e-mail deles). Basta um dos dois. */
public record ConviteRequest(@NotNull Long partyId, @Email String email, Long usuarioId) {}
