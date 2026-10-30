package br.com.ecoturismo.usuario;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.ecoturismo.security.JwtService;
import br.com.ecoturismo.security.dto.AuthResponse;
import br.com.ecoturismo.usuario.dto.TrocaSenhaRequest;
import br.com.ecoturismo.usuario.dto.UsuarioResponse;
import br.com.ecoturismo.usuario.dto.UsuarioUpdateRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService service;
    private final JwtService jwtService;

    public UsuarioController(UsuarioService service, JwtService jwtService) {
        this.service = service;
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public UsuarioResponse eu(Authentication auth) {
        return UsuarioResponse.de(service.buscarPorEmail(auth.getName()));
    }

    @PutMapping("/me")
    public UsuarioResponse atualizar(Authentication auth, @Valid @RequestBody UsuarioUpdateRequest req) {
        return UsuarioResponse.de(service.atualizar(auth.getName(), req));
    }

    /** Troca a senha. Os tokens antigos (inclusive o desta requisição) deixam de valer, então devolve um novo. */
    @PutMapping("/me/senha")
    public AuthResponse trocarSenha(Authentication auth, @Valid @RequestBody TrocaSenhaRequest req) {
        Usuario u = service.trocarSenha(auth.getName(), req.senhaAtual(), req.novaSenha());
        return new AuthResponse(jwtService.gerarToken(u), UsuarioResponse.de(u));
    }

    /** Envio da foto de perfil: multipart com o campo "arquivo" (JPG, PNG ou WebP). */
    @PostMapping(path = "/me/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UsuarioResponse enviarFoto(Authentication auth, @RequestParam("arquivo") MultipartFile arquivo) {
        return UsuarioResponse.de(service.atualizarFoto(auth.getName(), arquivo));
    }

    @DeleteMapping("/me/foto")
    public UsuarioResponse removerFoto(Authentication auth) {
        return UsuarioResponse.de(service.removerFoto(auth.getName()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UsuarioResponse> listar() {
        return service.listar().stream().map(UsuarioResponse::de).toList();
    }
}
