package br.com.ecoturismo.trilha;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.trilha.dto.FaixaDuracao;
import br.com.ecoturismo.trilha.dto.TrilhaRequest;
import br.com.ecoturismo.trilha.dto.TrilhaResponse;
import br.com.ecoturismo.usuario.UsuarioService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trilhas")
public class TrilhaController {

    private final TrilhaService service;
    private final UsuarioService usuarioService;

    public TrilhaController(TrilhaService service, UsuarioService usuarioService) {
        this.service = service;
        this.usuarioService = usuarioService;
    }

    /** Ex.: GET /api/trilhas?q=pedra&dificuldade=FACIL&dificuldade=MODERADO&zona=ZONA_SUL&duracao=CURTA */
    @GetMapping
    public List<TrilhaResponse> listar(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) List<Dificuldade> dificuldade,
                                       @RequestParam(required = false) List<Zona> zona,
                                       @RequestParam(required = false) FaixaDuracao duracao) {
        return service.buscar(q, dificuldade, zona, duracao).stream().map(TrilhaResponse::de).toList();
    }

    @GetMapping("/destaques")
    public List<TrilhaResponse> destaques() {
        return service.destaques().stream().map(TrilhaResponse::de).toList();
    }

    @GetMapping("/{id}")
    public TrilhaResponse buscar(@PathVariable Long id) {
        return TrilhaResponse.de(service.buscarPorId(id));
    }

    @PostMapping("/{id}/curtir")
    public Map<String, Object> curtir(@PathVariable Long id, Authentication auth) {
        service.garantirQueExiste(id);
        boolean curtida = usuarioService.alternarCurtida(auth.getName(), id);
        return Map.of("trilhaId", id, "curtida", curtida);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public TrilhaResponse criar(@Valid @RequestBody TrilhaRequest req) {
        return TrilhaResponse.de(service.criar(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public TrilhaResponse atualizar(@PathVariable Long id, @Valid @RequestBody TrilhaRequest req) {
        return TrilhaResponse.de(service.atualizar(id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void remover(@PathVariable Long id) {
        service.remover(id);
    }
}
