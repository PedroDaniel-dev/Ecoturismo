package br.com.ecoturismo.visita;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.bloqueio.BloqueioRepository;
import br.com.ecoturismo.trilha.TrilhaService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.dto.ConcluirVisitaRequest;
import br.com.ecoturismo.visita.dto.RegistrarVisitaRequest;
import br.com.ecoturismo.visita.dto.VisitaRequest;

@Service
@Transactional
public class VisitaService {

    private final VisitaRepository repository;
    private final UsuarioService usuarioService;
    private final TrilhaService trilhaService;
    private final BloqueioRepository bloqueioRepository;

    public VisitaService(VisitaRepository repository, UsuarioService usuarioService, TrilhaService trilhaService,
                         BloqueioRepository bloqueioRepository) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.trilhaService = trilhaService;
        this.bloqueioRepository = bloqueioRepository;
    }

    @Transactional(readOnly = true)
    public List<Visita> minhas(String email) {
        return repository.findByUsuarioId(usuarioService.buscarPorEmail(email).getId()).stream().sorted(Visita.RECENTES).toList();
    }

    /**
     * Avaliações de uma trilha: visitas concluídas com nota. A rota é pública: sem login (email null) mostra todas;
     * logado, somem as de quem tem bloqueio com quem está vendo.
     */
    @Transactional(readOnly = true)
    public List<Visita> avaliacoes(Long trilhaId, String emailOuNull) {
        trilhaService.garantirQueExiste(trilhaId);
        Set<Long> ocultos = emailOuNull == null ? Set.of()
                : bloqueioRepository.idsComBloqueio(usuarioService.buscarPorEmail(emailOuNull).getId());
        return repository.findByTrilhaIdAndStatus(trilhaId, StatusVisita.CONCLUIDA).stream()
                .filter(v -> v.getAvaliacao() != null && !ocultos.contains(v.getUsuarioId()))
                .sorted(Visita.RECENTES)
                .toList();
    }

    public Visita planejar(String email, VisitaRequest req) {
        trilhaService.garantirQueExiste(req.trilhaId());
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        exigirDataLivre(meuId, req.trilhaId(), req.data());
        Visita v = new Visita();
        v.setUsuarioId(meuId);
        v.setTrilhaId(req.trilhaId());
        v.setData(req.data());
        return repository.save(v);
    }

    /** Visita que já aconteceu, registrada de uma vez com a nota. */
    public Visita registrarConcluida(String email, RegistrarVisitaRequest req) {
        trilhaService.garantirQueExiste(req.trilhaId());
        Long meuId = usuarioService.buscarPorEmail(email).getId();
        exigirDataLivre(meuId, req.trilhaId(), req.data());
        Visita v = new Visita();
        v.setUsuarioId(meuId);
        v.setTrilhaId(req.trilhaId());
        v.setData(req.data());
        v.setStatus(StatusVisita.CONCLUIDA);
        v.setAvaliacao(meiaEstrela(req.avaliacao()));
        v.setComentario(texto(req.comentario()));
        return repository.save(v);
    }

    public Visita concluir(String email, Long id, ConcluirVisitaRequest req) {
        Visita v = doUsuario(email, id);
        v.setStatus(StatusVisita.CONCLUIDA);
        v.setAvaliacao(meiaEstrela(req.avaliacao()));
        v.setComentario(texto(req.comentario()));
        return repository.save(v);
    }

    public Visita cancelar(String email, Long id) {
        Visita v = doUsuario(email, id);
        v.setStatus(StatusVisita.CANCELADA);
        return repository.save(v);
    }

    // o banco tem UNIQUE (idUsuario, idTrilha, data): melhor avisar com uma mensagem clara do que estourar o índice
    private void exigirDataLivre(Long usuarioId, Long trilhaId, LocalDate data) {
        if (repository.existsByUsuarioIdAndTrilhaIdAndData(usuarioId, trilhaId, data)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já registrou uma visita a esta trilha nesta data");
        }
    }

    /** Aceita só múltiplos de 0,5 (meia estrela). */
    private static BigDecimal meiaEstrela(BigDecimal nota) {
        if (nota == null) return null;
        if (nota.multiply(BigDecimal.valueOf(2)).stripTrailingZeros().scale() > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nota vai de 0,5 em 0,5 (meia estrela)");
        }
        return nota;
    }

    private static String texto(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Visita doUsuario(String email, Long id) {
        Usuario u = usuarioService.buscarPorEmail(email);
        Visita v = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visita não encontrada"));
        if (!v.getUsuarioId().equals(u.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta visita pertence a outro usuário");
        }
        return v;
    }
}
