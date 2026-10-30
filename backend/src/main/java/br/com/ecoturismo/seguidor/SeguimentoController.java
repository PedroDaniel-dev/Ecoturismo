package br.com.ecoturismo.seguidor;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.seguidor.dto.SeguirResponse;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;

@RestController
@RequestMapping("/api/usuarios/{id}")
public class SeguimentoController {

    private final SeguimentoService service;

    public SeguimentoController(SeguimentoService service) {
        this.service = service;
    }

    @PostMapping("/seguir")
    public SeguirResponse seguir(Authentication auth, @PathVariable Long id) {
        service.seguir(auth.getName(), id);
        return service.estado(auth.getName(), id);
    }

    @DeleteMapping("/seguir")
    public SeguirResponse deixarDeSeguir(Authentication auth, @PathVariable Long id) {
        service.deixarDeSeguir(auth.getName(), id);
        return service.estado(auth.getName(), id);
    }

    @GetMapping("/seguidores")
    public List<UsuarioResumo> seguidores(Authentication auth, @PathVariable Long id) {
        return resumos(service.listaVisivel(auth.getName(), id, service::seguidores));
    }

    @GetMapping("/seguindo")
    public List<UsuarioResumo> seguindo(Authentication auth, @PathVariable Long id) {
        return resumos(service.listaVisivel(auth.getName(), id, service::seguindo));
    }

    /** Amigos = quem se segue mutuamente. */
    @GetMapping("/amigos")
    public List<UsuarioResumo> amigos(Authentication auth, @PathVariable Long id) {
        return resumos(service.listaVisivel(auth.getName(), id, service::amigos));
    }

    private static List<UsuarioResumo> resumos(List<Usuario> usuarios) {
        return usuarios.stream().map(UsuarioResumo::de).toList();
    }
}
