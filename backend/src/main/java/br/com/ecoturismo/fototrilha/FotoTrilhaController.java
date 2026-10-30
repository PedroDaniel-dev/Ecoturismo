package br.com.ecoturismo.fototrilha;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.ecoturismo.fototrilha.dto.FotoTrilhaResponse;

@RestController
@RequestMapping("/api/trilhas/{trilhaId}/fotos")
public class FotoTrilhaController {

    private final FotoTrilhaService service;

    public FotoTrilhaController(FotoTrilhaService service) {
        this.service = service;
    }

    @GetMapping
    public List<FotoTrilhaResponse> daTrilha(Authentication auth, @PathVariable Long trilhaId) {
        String email = auth == null || auth instanceof AnonymousAuthenticationToken ? null : auth.getName();
        return service.daTrilha(trilhaId, email).stream().map(FotoTrilhaResponse::de).toList();
    }

    /** Multipart com o campo "arquivo" (JPG, PNG ou WebP) e, opcional, "legenda". */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FotoTrilhaResponse enviar(Authentication auth, @PathVariable Long trilhaId,
                                     @RequestParam("arquivo") MultipartFile arquivo,
                                     @RequestParam(value = "legenda", required = false) String legenda) {
        return FotoTrilhaResponse.de(service.enviar(auth.getName(), trilhaId, arquivo, legenda));
    }

    @DeleteMapping("/{fotoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(Authentication auth, @PathVariable Long trilhaId, @PathVariable Long fotoId) {
        service.remover(auth.getName(), trilhaId, fotoId);
    }
}
