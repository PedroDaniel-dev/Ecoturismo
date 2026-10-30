package br.com.ecoturismo.convite;

public enum StatusConvite {
    PENDENTE,
    ACEITO,
    RECUSADO,
    /** desfeito sem resposta do convidado (ex.: um dos dois bloqueou o outro) */
    CANCELADO
}
