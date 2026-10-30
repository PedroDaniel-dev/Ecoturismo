package br.com.ecoturismo.party;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.party.dto.PartyRequest;
import br.com.ecoturismo.party.dto.PartyResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/parties")
public class PartyController {

    private final PartyService service;

    public PartyController(PartyService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PartyResponse criar(Authentication auth, @Valid @RequestBody PartyRequest req) {
        return PartyResponse.de(service.criar(auth.getName(), req));
    }

    @GetMapping("/minhas")
    public List<PartyResponse> minhas(Authentication auth) {
        return service.minhas(auth.getName()).stream().map(PartyResponse::de).toList();
    }

    @GetMapping("/{id}")
    public PartyResponse buscar(Authentication auth, @PathVariable Long id) {
        return PartyResponse.de(service.buscarComoMembro(auth.getName(), id));
    }

    @PostMapping("/{id}/sair")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sair(Authentication auth, @PathVariable Long id) {
        service.sair(auth.getName(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(Authentication auth, @PathVariable Long id) {
        service.excluir(auth.getName(), id);
    }
}
