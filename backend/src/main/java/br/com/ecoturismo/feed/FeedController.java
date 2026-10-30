package br.com.ecoturismo.feed;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;
import br.com.ecoturismo.visita.dto.VisitaPublicaResponse;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final FeedService service;
    private final UsuarioService usuarioService;

    public FeedController(FeedService service, UsuarioService usuarioService) {
        this.service = service;
        this.usuarioService = usuarioService;
    }

    /** ?pagina=0&tamanho=20 (máximo 50). Uma página com menos itens que o tamanho é a última. */
    @GetMapping
    public List<VisitaPublicaResponse> feed(Authentication auth,
                                       @RequestParam(defaultValue = "0") int pagina,
                                       @RequestParam(defaultValue = "20") int tamanho) {
        return service.doUsuario(auth.getName(), pagina, tamanho).stream()
                .map(v -> VisitaPublicaResponse.de(v, UsuarioResumo.de(usuarioService.buscarPorId(v.getUsuarioId()))))
                .toList();
    }
}
