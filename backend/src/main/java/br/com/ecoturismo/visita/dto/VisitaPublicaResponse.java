package br.com.ecoturismo.visita.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.ecoturismo.usuario.dto.UsuarioResumo;
import br.com.ecoturismo.visita.Visita;

/** Visita concluída com quem foi, para o feed e as avaliações da trilha (a tela não precisa buscar o usuário à parte). */
public record VisitaPublicaResponse(Long visitaId, UsuarioResumo usuario, Long trilhaId, LocalDate data, BigDecimal avaliacao, String comentario) {

    public static VisitaPublicaResponse de(Visita v, UsuarioResumo usuario) {
        return new VisitaPublicaResponse(v.getId(), usuario, v.getTrilhaId(), v.getData(), v.getAvaliacao(), v.getComentario());
    }
}
