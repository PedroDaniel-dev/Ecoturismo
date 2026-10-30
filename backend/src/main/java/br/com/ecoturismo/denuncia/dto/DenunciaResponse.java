package br.com.ecoturismo.denuncia.dto;

import java.time.LocalDateTime;

import br.com.ecoturismo.denuncia.Denuncia;

public record DenunciaResponse(Long id, Long denuncianteId, Long denunciadoId, String motivo, String descricao, String status, LocalDateTime criadoEm) {

    public static DenunciaResponse de(Denuncia d) {
        return new DenunciaResponse(d.getId(), d.getDenuncianteId(), d.getDenunciadoId(), d.getMotivo().name(),
                d.getDescricao(), d.getStatus().name(), d.getCriadoEm());
    }
}
