package br.com.ecoturismo.visita.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.ecoturismo.visita.Visita;

public record VisitaResponse(Long id, Long usuarioId, Long trilhaId, LocalDate data, String status, BigDecimal avaliacao, String comentario) {

    public static VisitaResponse de(Visita v) {
        return new VisitaResponse(v.getId(), v.getUsuarioId(), v.getTrilhaId(), v.getData(), v.getStatus().name(), v.getAvaliacao(), v.getComentario());
    }
}
