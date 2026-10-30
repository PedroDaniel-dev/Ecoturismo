package br.com.ecoturismo.bloqueio;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.usuario.dto.UsuarioResumo;

@RestController
@RequestMapping("/api/usuarios")
public class BloqueioController {

    private final BloqueioService service;

    public BloqueioController(BloqueioService service) {
        this.service = service;
    }

    @PostMapping("/{id}/bloquear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void bloquear(Authentication auth, @PathVariable Long id) {
        service.bloquear(auth.getName(), id);
    }

    @DeleteMapping("/{id}/bloquear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desbloquear(Authentication auth, @PathVariable Long id) {
        service.desbloquear(auth.getName(), id);
    }

    @GetMapping("/me/bloqueados")
    public List<UsuarioResumo> bloqueados(Authentication auth) {
        return service.bloqueados(auth.getName()).stream().map(UsuarioResumo::de).toList();
    }
}
