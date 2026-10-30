package br.com.ecoturismo.party.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import br.com.ecoturismo.party.Party;

public record PartyResponse(Long id, String nome, String descricao, Long trilhaId, LocalDate data, LocalTime horario, Long liderId, Set<Long> membros) {

    public static PartyResponse de(Party p) {
        return new PartyResponse(p.getId(), p.getNome(), p.getDescricao(), p.getTrilhaId(), p.getData(), p.getHorario(),
                p.getLiderId(), Set.copyOf(p.getMembros()));
    }
}
