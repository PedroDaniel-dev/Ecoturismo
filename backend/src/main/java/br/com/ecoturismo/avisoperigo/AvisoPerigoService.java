package br.com.ecoturismo.avisoperigo;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.avisoperigo.dto.AvisoRequest;
import br.com.ecoturismo.trilha.TrilhaService;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;
import br.com.ecoturismo.visita.Visita;
import br.com.ecoturismo.visita.VisitaRepository;

@Service
@Transactional
public class AvisoPerigoService {

    private final AvisoPerigoRepository repository;
    private final TrilhaService trilhaService;
    private final UsuarioService usuarioService;
    private final VisitaRepository visitaRepository;

    public AvisoPerigoService(AvisoPerigoRepository repository, TrilhaService trilhaService,
                              UsuarioService usuarioService, VisitaRepository visitaRepository) {
        this.repository = repository;
        this.trilhaService = trilhaService;
        this.usuarioService = usuarioService;
        this.visitaRepository = visitaRepository;
    }

    public AvisoPerigo registrar(String email, AvisoRequest req) {
        Usuario u = usuarioService.buscarPorEmail(email);
        if (req.trilhaId() != null) trilhaService.garantirQueExiste(req.trilhaId());
        Long trilhaId = req.trilhaId();
        if (req.visitaId() != null) {
            Visita v = visitaRepository.findById(req.visitaId())
                    .filter(x -> x.getUsuarioId().equals(u.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Visita inválida"));
            // a visita já diz qual é a trilha; se vier as duas, têm de bater
            if (trilhaId != null && !trilhaId.equals(v.getTrilhaId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A visita não é desta trilha");
            }
            trilhaId = v.getTrilhaId();
        }
        AvisoPerigo a = new AvisoPerigo();
        a.setTipo(req.tipo());
        a.setUsuarioId(u.getId());
        a.setTrilhaTexto(req.trilha().trim());
        a.setTrilhaId(trilhaId);
        a.setVisitaId(req.visitaId());
        a.setMensagem(req.mensagem().trim());
        return repository.save(a);
    }

    @Transactional(readOnly = true)
    public List<AvisoPerigo> listar() {
        return repository.findAllByOrderByCriadoEmDesc();
    }

    /** Avisos de perigo de todas as trilhas, mais recentes primeiro; sem status, vêm todos. */
    @Transactional(readOnly = true)
    public List<AvisoPerigo> perigos(StatusAviso statusOuNull) {
        return statusOuNull == null
                ? repository.findByTipoOrderByCriadoEmDesc(TipoAviso.PERIGO)
                : repository.findByTipoAndStatusOrderByCriadoEmDesc(TipoAviso.PERIGO, statusOuNull);
    }

    @Transactional(readOnly = true)
    public List<AvisoPerigo> perigosAtivos(Long trilhaId) {
        return repository.findAtivosByTrilhaId(trilhaId);
    }

    public AvisoPerigo alterarStatus(Long id, StatusAviso status) {
        AvisoPerigo a = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aviso não encontrado"));
        a.setStatus(status);
        return repository.save(a);
    }
}
