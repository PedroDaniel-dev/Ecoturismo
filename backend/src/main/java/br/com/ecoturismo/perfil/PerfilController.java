package br.com.ecoturismo.perfil;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.fototrilha.dto.FotoTrilhaResponse;
import br.com.ecoturismo.perfil.dto.PerfilResponse;
import br.com.ecoturismo.visita.dto.VisitaResponse;

@RestController
@RequestMapping("/api/usuarios/{id}")
public class PerfilController {

    private final PerfilService service;

    public PerfilController(PerfilService service) {
        this.service = service;
    }

    @GetMapping("/perfil")
    public PerfilResponse perfil(Authentication auth, @PathVariable Long id) {
        return service.perfil(auth.getName(), id);
    }

    @GetMapping("/avaliacoes")
    public List<VisitaResponse> avaliacoes(Authentication auth, @PathVariable Long id) {
        return service.avaliacoes(auth.getName(), id).stream().map(VisitaResponse::de).toList();
    }

    @GetMapping("/visitas")
    public List<VisitaResponse> visitas(Authentication auth, @PathVariable Long id) {
        return service.visitas(auth.getName(), id).stream().map(VisitaResponse::de).toList();
    }

    @GetMapping("/fotos")
    public List<FotoTrilhaResponse> fotos(Authentication auth, @PathVariable Long id) {
        return service.fotos(auth.getName(), id).stream().map(FotoTrilhaResponse::de).toList();
    }
}
