package br.com.ecoturismo.convite;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.convite.dto.ConviteRequest;
import br.com.ecoturismo.convite.dto.ConviteResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/convites")
public class ConviteController {

    private final ConviteService service;

    public ConviteController(ConviteService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConviteResponse convidar(Authentication auth, @Valid @RequestBody ConviteRequest req) {
        return ConviteResponse.de(service.convidar(auth.getName(), req));
    }

    @GetMapping("/recebidos")
    public List<ConviteResponse> recebidos(Authentication auth) {
        return service.recebidos(auth.getName()).stream().map(ConviteResponse::de).toList();
    }

    @PatchMapping("/{id}/aceitar")
    public ConviteResponse aceitar(Authentication auth, @PathVariable Long id) {
        return ConviteResponse.de(service.aceitar(auth.getName(), id));
    }

    @PatchMapping("/{id}/recusar")
    public ConviteResponse recusar(Authentication auth, @PathVariable Long id) {
        return ConviteResponse.de(service.recusar(auth.getName(), id));
    }
}
