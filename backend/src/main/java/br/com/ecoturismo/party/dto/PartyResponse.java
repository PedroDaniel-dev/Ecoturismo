package br.com.ecoturismo.party.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.function.Function;

import br.com.ecoturismo.party.Party;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;

/** Party com o líder e os membros já resolvidos (nome e foto), para a tela não buscar cada usuário à parte. */
public record PartyResponse(Long id, String nome, String descricao, Long trilhaId, LocalDate data, LocalTime horario,
                            UsuarioResumo lider, List<UsuarioResumo> membros) {

    public static PartyResponse de(Party p, Function<Long, UsuarioResumo> usuario) {
        return new PartyResponse(p.getId(), p.getNome(), p.getDescricao(), p.getTrilhaId(), p.getData(), p.getHorario(),
                usuario.apply(p.getLiderId()), p.getMembros().stream().map(usuario).toList());
    }
}
