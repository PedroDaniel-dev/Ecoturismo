package br.com.ecoturismo.seguidor.dto;

/** Estado depois de seguir ou deixar de seguir, com o total atualizado para a tela. amigos = os dois se seguem. */
public record SeguirResponse(boolean seguindo, boolean amigos, long seguidores) {}
