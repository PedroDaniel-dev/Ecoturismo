package br.com.ecoturismo.party.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import br.com.ecoturismo.party.Party;

/** O que o convite mostra da party: quem é convidado ainda não é membro, então não vê a lista de membros. */
public record PartyResumo(Long id, String nome, Long trilhaId, LocalDate data, LocalTime horario, int totalMembros) {

    public static PartyResumo de(Party p) {
        return new PartyResumo(p.getId(), p.getNome(), p.getTrilhaId(), p.getData(), p.getHorario(), p.getMembros().size());
    }
}
