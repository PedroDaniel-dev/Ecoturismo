package br.com.ecoturismo.visita;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;
import br.com.ecoturismo.visita.dto.ConcluirVisitaRequest;
import br.com.ecoturismo.visita.dto.RegistrarVisitaRequest;
import br.com.ecoturismo.visita.dto.VisitaPublicaResponse;
import br.com.ecoturismo.visita.dto.VisitaRequest;
import br.com.ecoturismo.visita.dto.VisitaResponse;
import jakarta.validation.Valid;

@RestController
public class VisitaController {

    private final VisitaService service;
    private final UsuarioService usuarioService;

    public VisitaController(VisitaService service, UsuarioService usuarioService) {
        this.service = service;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/api/visitas/minhas")
    public List<VisitaResponse> minhas(Authentication auth) {
        return service.minhas(auth.getName()).stream().map(VisitaResponse::de).toList();
    }

    /** Público (fica sob /api/trilhas/**): as avaliações que aparecem na página da trilha. */
    @GetMapping("/api/trilhas/{trilhaId}/avaliacoes")
    public List<VisitaPublicaResponse> avaliacoes(Authentication auth, @PathVariable Long trilhaId) {
        String email = auth == null || auth instanceof AnonymousAuthenticationToken ? null : auth.getName();
        return service.avaliacoes(trilhaId, email).stream()
                .map(v -> VisitaPublicaResponse.de(v, UsuarioResumo.de(usuarioService.buscarPorId(v.getUsuarioId()))))
                .toList();
    }

    @PostMapping("/api/visitas")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitaResponse planejar(Authentication auth, @Valid @RequestBody VisitaRequest req) {
        return VisitaResponse.de(service.planejar(auth.getName(), req));
    }

    @PostMapping("/api/visitas/concluida")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitaResponse registrarConcluida(Authentication auth, @Valid @RequestBody RegistrarVisitaRequest req) {
        return VisitaResponse.de(service.registrarConcluida(auth.getName(), req));
    }

    @PatchMapping("/api/visitas/{id}/concluir")
    public VisitaResponse concluir(Authentication auth, @PathVariable Long id, @Valid @RequestBody ConcluirVisitaRequest req) {
        return VisitaResponse.de(service.concluir(auth.getName(), id, req));
    }

    @PatchMapping("/api/visitas/{id}/cancelar")
    public VisitaResponse cancelar(Authentication auth, @PathVariable Long id) {
        return VisitaResponse.de(service.cancelar(auth.getName(), id));
    }
}
