package br.com.ecoturismo.convite.dto;

import java.time.LocalDateTime;

import br.com.ecoturismo.convite.Convite;

public record ConviteResponse(Long id, Long partyId, Long remetenteId, Long destinatarioId, String status, LocalDateTime criadoEm) {

    public static ConviteResponse de(Convite c) {
        return new ConviteResponse(c.getId(), c.getPartyId(), c.getRemetenteId(), c.getDestinatarioId(), c.getStatus().name(), c.getCriadoEm());
    }
}
