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
import br.com.ecoturismo.party.PartyService;
import br.com.ecoturismo.party.dto.PartyResumo;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.usuario.dto.UsuarioResumo;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/convites")
public class ConviteController {

    private final ConviteService service;
    private final PartyService partyService;
    private final UsuarioService usuarioService;

    public ConviteController(ConviteService service, PartyService partyService, UsuarioService usuarioService) {
        this.service = service;
        this.partyService = partyService;
        this.usuarioService = usuarioService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConviteResponse convidar(Authentication auth, @Valid @RequestBody ConviteRequest req) {
        return resposta(service.convidar(auth.getName(), req));
    }

    @GetMapping("/recebidos")
    public List<ConviteResponse> recebidos(Authentication auth) {
        return service.recebidos(auth.getName()).stream().map(this::resposta).toList();
    }

    @GetMapping("/party/{partyId}")
    public List<ConviteResponse> daParty(Authentication auth, @PathVariable Long partyId) {
        return service.daParty(auth.getName(), partyId).stream().map(this::resposta).toList();
    }

    @PatchMapping("/{id}/aceitar")
    public ConviteResponse aceitar(Authentication auth, @PathVariable Long id) {
        return resposta(service.aceitar(auth.getName(), id));
    }

    @PatchMapping("/{id}/recusar")
    public ConviteResponse recusar(Authentication auth, @PathVariable Long id) {
        return resposta(service.recusar(auth.getName(), id));
    }

    private ConviteResponse resposta(Convite c) {
        return ConviteResponse.de(c, PartyResumo.de(partyService.buscarPorId(c.getPartyId())),
                UsuarioResumo.de(usuarioService.buscarPorId(c.getRemetenteId())),
                UsuarioResumo.de(usuarioService.buscarPorId(c.getDestinatarioId())));
    }
}
