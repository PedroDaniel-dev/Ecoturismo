package br.com.ecoturismo.convite.dto;

import java.time.LocalDateTime;

import br.com.ecoturismo.convite.Convite;
import br.com.ecoturismo.party.dto.PartyResumo;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;

/** Convite com a party, quem convidou e quem foi convidado já resolvidos, para listar sem outras chamadas. */
public record ConviteResponse(Long id, String status, LocalDateTime criadoEm, PartyResumo party,
                              UsuarioResumo remetente, UsuarioResumo convidado) {

    public static ConviteResponse de(Convite c, PartyResumo party, UsuarioResumo remetente, UsuarioResumo convidado) {
        return new ConviteResponse(c.getId(), c.getStatus().name(), c.getCriadoEm(), party, remetente, convidado);
    }
}
