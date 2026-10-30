package br.com.ecoturismo.fototrilha;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.bloqueio.BloqueioRepository;
import br.com.ecoturismo.config.ImagemStorage;
import br.com.ecoturismo.trilha.TrilhaService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.StatusVisita;
import br.com.ecoturismo.visita.Visita;
import br.com.ecoturismo.visita.VisitaRepository;

@Service
@Transactional
public class FotoTrilhaService {

    private static final int LEGENDA_MAX = 250;

    private final FotoTrilhaRepository repository;
    private final UsuarioService usuarioService;
    private final TrilhaService trilhaService;
    private final ImagemStorage imagens;
    private final BloqueioRepository bloqueioRepository;
    private final VisitaRepository visitaRepository;

    public FotoTrilhaService(FotoTrilhaRepository repository, UsuarioService usuarioService, TrilhaService trilhaService,
                             ImagemStorage imagens, BloqueioRepository bloqueioRepository, VisitaRepository visitaRepository) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.trilhaService = trilhaService;
        this.imagens = imagens;
        this.bloqueioRepository = bloqueioRepository;
        this.visitaRepository = visitaRepository;
    }

    /**
     * A foto fica presa a uma visita do usuário à trilha (FOTO.idVisita): a concluída mais recente ou, sem nenhuma,
     * a planejada mais recente. Sem visita registrada não dá para enviar.
     */
    private Visita visitaParaFoto(Long usuarioId, Long trilhaId) {
        return visitaRepository.findByUsuarioIdAndTrilhaId(usuarioId, trilhaId).stream()
                .filter(v -> v.getStatus() != StatusVisita.CANCELADA)
                .min(Comparator.comparing((Visita v) -> v.getStatus() == StatusVisita.CONCLUIDA ? 0 : 1)
                        .thenComparing(Visita.RECENTES))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Registre uma visita a esta trilha para poder enviar fotos dela"));
    }

    public FotoTrilha enviar(String email, Long trilhaId, MultipartFile arquivo, String legenda) {
        Usuario u = usuarioService.buscarPorEmail(email);
        trilhaService.garantirQueExiste(trilhaId);
        if (legenda != null && legenda.length() > LEGENDA_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A legenda deve ter no máximo " + LEGENDA_MAX + " caracteres");
        }
        FotoTrilha f = new FotoTrilha();
        f.setVisita(visitaParaFoto(u.getId(), trilhaId));
        f.setUrl(imagens.salvar(prefixo(trilhaId, u.getId()), arquivo));
        f.setLegenda(legenda == null || legenda.isBlank() ? null : legenda.trim());
        return repository.save(f);
    }

    public List<FotoTrilha> doUsuario(Long usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    /** Fotos de uma trilha. A rota é pública: sem login (email null) não há o que esconder; logado, somem as de quem tem bloqueio. */
    public List<FotoTrilha> daTrilha(Long trilhaId, String emailOuNull) {
        trilhaService.garantirQueExiste(trilhaId);
        List<FotoTrilha> fotos = repository.findByTrilhaId(trilhaId);
        if (emailOuNull == null) return fotos;
        Set<Long> ocultos = bloqueioRepository.idsComBloqueio(usuarioService.buscarPorEmail(emailOuNull).getId());
        return fotos.stream().filter(f -> !ocultos.contains(f.getUsuarioId())).toList();
    }

    public void remover(String email, Long trilhaId, Long fotoId) {
        Usuario u = usuarioService.buscarPorEmail(email);
        FotoTrilha f = repository.findById(fotoId)
                .filter(x -> x.getTrilhaId().equals(trilhaId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada"));
        if (!f.getUsuarioId().equals(u.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta foto pertence a outro usuário");
        }
        imagens.remover(prefixo(trilhaId, u.getId()), f.getUrl());
        repository.deleteById(f.getId());
    }

    public long contarDoUsuario(Long usuarioId) {
        return repository.countByVisitaUsuarioId(usuarioId);
    }

    private static String prefixo(Long trilhaId, Long usuarioId) {
        return "trilha-" + trilhaId + "-usuario-" + usuarioId + "-";
    }
}
