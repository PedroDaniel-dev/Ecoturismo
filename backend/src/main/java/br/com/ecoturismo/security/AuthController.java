package br.com.ecoturismo.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.security.dto.AuthResponse;
import br.com.ecoturismo.security.dto.LoginRequest;
import br.com.ecoturismo.security.dto.RegisterRequest;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.usuario.dto.UsuarioResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioService usuarioService;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, UsuarioService usuarioService, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.senha()));
        Usuario u = usuarioService.buscarPorEmail(req.email());
        return new AuthResponse(jwtService.gerarToken(u), UsuarioResponse.de(u));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        Usuario u = usuarioService.cadastrar(req.nome(), req.email(), req.senha(), req.dataNascimento());
        return new AuthResponse(jwtService.gerarToken(u), UsuarioResponse.de(u));
    }
}
