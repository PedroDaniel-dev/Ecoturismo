package br.com.ecoturismo.avisoperigo;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.avisoperigo.dto.AvisoRequest;
import br.com.ecoturismo.avisoperigo.dto.AvisoResponse;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/avisos")
public class AvisoPerigoController {

    private final AvisoPerigoService service;
    private final UsuarioService usuarioService;

    public AvisoPerigoController(AvisoPerigoService service, UsuarioService usuarioService) {
        this.service = service;
        this.usuarioService = usuarioService;
    }

    /** Formulário da página inicial; exige login. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AvisoResponse registrar(Authentication auth, @Valid @RequestBody AvisoRequest req) {
        return resposta(service.registrar(auth.getName(), req));
    }

    /** Público: avisos de perigo ativos para exibir na página da trilha. */
    @GetMapping("/trilha/{trilhaId}")
    public List<AvisoResponse> perigosDaTrilha(@PathVariable Long trilhaId) {
        return service.perigosAtivos(trilhaId).stream().map(this::resposta).toList();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AvisoResponse> listar() {
        return service.listar().stream().map(this::resposta).toList();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public AvisoResponse alterarStatus(@PathVariable Long id, @RequestParam StatusAviso status) {
        return resposta(service.alterarStatus(id, status));
    }

    private AvisoResponse resposta(AvisoPerigo a) {
        return AvisoResponse.de(a, UsuarioResumo.de(usuarioService.buscarPorId(a.getUsuarioId())));
    }
}
