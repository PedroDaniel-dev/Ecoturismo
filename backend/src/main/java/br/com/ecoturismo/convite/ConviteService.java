package br.com.ecoturismo.convite;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.bloqueio.BloqueioRepository;
import br.com.ecoturismo.convite.dto.ConviteRequest;
import br.com.ecoturismo.party.Party;
import br.com.ecoturismo.party.PartyService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;

@Service
@Transactional
public class ConviteService {

    private final ConviteRepository repository;
    private final PartyService partyService;
    private final UsuarioService usuarioService;
    private final BloqueioRepository bloqueioRepository;

    public ConviteService(ConviteRepository repository, PartyService partyService, UsuarioService usuarioService,
                          BloqueioRepository bloqueioRepository) {
        this.repository = repository;
        this.partyService = partyService;
        this.usuarioService = usuarioService;
        this.bloqueioRepository = bloqueioRepository;
    }

    public Convite convidar(String emailRemetente, ConviteRequest req) {
        Usuario remetente = usuarioService.buscarPorEmail(emailRemetente);
        Party party = partyService.buscarPorId(req.partyId());
        partyService.exigirMembro(party, remetente.getId());

        Usuario destinatario = usuarioService.buscarPorEmail(req.email());
        if (bloqueioRepository.existeEntre(remetente.getId(), destinatario.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Não é possível convidar este usuário");
        }
        if (party.getMembros().contains(destinatario.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Usuário já faz parte do grupo");
        }
        // um convite por pessoa por party: se já houve um (recusado, cancelado...), ele volta a ficar pendente
        Convite c = repository.findByPartyIdAndDestinatarioId(party.getId(), destinatario.getId()).orElseGet(Convite::new);
        if (c.getStatus() == StatusConvite.PENDENTE && c.getId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um convite pendente para este usuário");
        }
        c.setPartyId(party.getId());
        c.setRemetenteId(remetente.getId());
        c.setDestinatarioId(destinatario.getId());
        c.setStatus(StatusConvite.PENDENTE);
        c.setCriadoEm(LocalDateTime.now());
        return repository.save(c);
    }

    public List<Convite> recebidos(String email) {
        return repository.findPendentesByDestinatarioId(usuarioService.buscarPorEmail(email).getId());
    }

    public Convite aceitar(String email, Long id) {
        Convite c = pendenteDoUsuario(email, id);
        partyService.adicionarMembro(c.getPartyId(), c.getDestinatarioId());
        c.setStatus(StatusConvite.ACEITO);
        return repository.save(c);
    }

    public Convite recusar(String email, Long id) {
        Convite c = pendenteDoUsuario(email, id);
        c.setStatus(StatusConvite.RECUSADO);
        return repository.save(c);
    }

    private Convite pendenteDoUsuario(String email, Long id) {
        Usuario u = usuarioService.buscarPorEmail(email);
        Convite c = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Convite não encontrado"));
        if (!c.getDestinatarioId().equals(u.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este convite não é seu");
        }
        if (c.getStatus() != StatusConvite.PENDENTE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Convite já respondido");
        }
        return c;
    }
}
