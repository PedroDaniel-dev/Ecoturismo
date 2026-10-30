package br.com.ecoturismo.party;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.party.dto.PartyRequest;
import br.com.ecoturismo.trilha.TrilhaService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;

@Service
@Transactional
public class PartyService {

    private final PartyRepository repository;
    private final UsuarioService usuarioService;
    private final TrilhaService trilhaService;

    public PartyService(PartyRepository repository, UsuarioService usuarioService, TrilhaService trilhaService) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.trilhaService = trilhaService;
    }

    public Party criar(String email, PartyRequest req) {
        trilhaService.garantirQueExiste(req.trilhaId());
        Usuario lider = usuarioService.buscarPorEmail(email);
        Party p = new Party();
        preencher(p, req);
        p.setLiderId(lider.getId());
        p.getMembros().add(lider.getId());
        return repository.save(p);
    }

    /** Só o líder muda nome, descrição, trilha, data e horário. Membros e convites continuam como estão. */
    public Party editar(String email, Long id, PartyRequest req) {
        Party p = buscarPorId(id);
        exigirLider(p, usuarioService.buscarPorEmail(email).getId(), "Apenas o líder pode editar o grupo");
        trilhaService.garantirQueExiste(req.trilhaId());
        preencher(p, req);
        return repository.save(p);
    }

    private static void preencher(Party p, PartyRequest req) {
        p.setNome(req.nome().trim());
        p.setDescricao(req.descricao() == null || req.descricao().isBlank() ? null : req.descricao().trim());
        p.setTrilhaId(req.trilhaId());
        p.setData(req.data());
        p.setHorario(req.horario());
    }

    private static void exigirLider(Party p, Long usuarioId, String mensagem) {
        if (!p.getLiderId().equals(usuarioId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensagem);
    }

    public List<Party> minhas(String email) {
        return repository.findByMembro(usuarioService.buscarPorEmail(email).getId());
    }

    public Party buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grupo não encontrado"));
    }

    /** Só membros enxergam os detalhes do grupo. */
    public Party buscarComoMembro(String email, Long id) {
        Party p = buscarPorId(id);
        exigirMembro(p, usuarioService.buscarPorEmail(email).getId());
        return p;
    }

    public void exigirMembro(Party p, Long usuarioId) {
        if (!p.getMembros().contains(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não faz parte deste grupo");
        }
    }

    public Party adicionarMembro(Long partyId, Long usuarioId) {
        Party p = buscarPorId(partyId);
        p.getMembros().add(usuarioId);
        return repository.save(p);
    }

    /** Membro sai do grupo. Se o líder sair, a liderança passa ao próximo membro; sem membros, o grupo é removido. */
    public void sair(String email, Long id) {
        Party p = buscarComoMembro(email, id);
        Long usuarioId = usuarioService.buscarPorEmail(email).getId();
        p.getMembros().remove(usuarioId);
        if (p.getMembros().isEmpty()) {
            repository.deleteById(id);
            return;
        }
        if (p.getLiderId().equals(usuarioId)) {
            p.setLiderId(p.getMembros().iterator().next());
        }
        repository.save(p);
    }

    public void excluir(String email, Long id) {
        Party p = buscarPorId(id);
        exigirLider(p, usuarioService.buscarPorEmail(email).getId(), "Apenas o líder pode excluir o grupo");
        repository.deleteById(id);
    }
}
