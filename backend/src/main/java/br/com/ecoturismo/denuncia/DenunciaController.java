package br.com.ecoturismo.denuncia;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.denuncia.dto.DenunciaRequest;
import br.com.ecoturismo.denuncia.dto.DenunciaResponse;
import jakarta.validation.Valid;

@RestController
public class DenunciaController {

    private final DenunciaService service;

    public DenunciaController(DenunciaService service) {
        this.service = service;
    }

    @PostMapping("/api/usuarios/{id}/denunciar")
    @ResponseStatus(HttpStatus.CREATED)
    public DenunciaResponse denunciar(Authentication auth, @PathVariable Long id, @Valid @RequestBody DenunciaRequest req) {
        return DenunciaResponse.de(service.denunciar(auth.getName(), id, req));
    }

    @GetMapping("/api/denuncias")
    @PreAuthorize("hasRole('ADMIN')")
    public List<DenunciaResponse> listar() {
        return service.listar().stream().map(DenunciaResponse::de).toList();
    }

    @PatchMapping("/api/denuncias/{id}/analisada")
    @PreAuthorize("hasRole('ADMIN')")
    public DenunciaResponse marcarComoAnalisada(@PathVariable Long id) {
        return DenunciaResponse.de(service.marcarComoAnalisada(id));
    }
}
