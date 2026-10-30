package br.com.ecoturismo.avisoperigo.dto;

import java.time.LocalDateTime;

import br.com.ecoturismo.avisoperigo.AvisoPerigo;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;

/** Não expõe o e-mail de quem enviou. */
public record AvisoResponse(Long id, String tipo, UsuarioResumo autor, String trilha, Long trilhaId, String mensagem, String status, LocalDateTime criadoEm) {

    public static AvisoResponse de(AvisoPerigo a, UsuarioResumo autor) {
        return new AvisoResponse(a.getId(), a.getTipo().name(), autor, a.getTrilhaTexto(), a.getTrilhaId(),
                a.getMensagem(), a.getStatus().name(), a.getCriadoEm());
    }
}
