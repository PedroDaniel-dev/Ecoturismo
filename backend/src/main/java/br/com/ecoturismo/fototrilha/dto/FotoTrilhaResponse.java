package br.com.ecoturismo.fototrilha.dto;

import java.time.LocalDateTime;

import br.com.ecoturismo.fototrilha.FotoTrilha;

public record FotoTrilhaResponse(Long id, Long usuarioId, Long trilhaId, String url, String legenda, LocalDateTime criadoEm) {

    public static FotoTrilhaResponse de(FotoTrilha f) {
        return new FotoTrilhaResponse(f.getId(), f.getUsuarioId(), f.getTrilhaId(), f.getUrl(), f.getLegenda(), f.getCriadoEm());
    }
}
