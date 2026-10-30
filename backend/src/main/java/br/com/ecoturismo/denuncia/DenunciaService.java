package br.com.ecoturismo.denuncia;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.denuncia.dto.DenunciaRequest;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioService;

@Service
@Transactional
public class DenunciaService {

    private final DenunciaRepository repository;
    private final UsuarioService usuarioService;

    public DenunciaService(DenunciaRepository repository, UsuarioService usuarioService) {
        this.repository = repository;
        this.usuarioService = usuarioService;
    }

    public Denuncia denunciar(String email, Long denunciadoId, DenunciaRequest req) {
        Usuario eu = usuarioService.buscarPorEmail(email);
        Usuario alvo = usuarioService.buscarPorId(denunciadoId);
        if (eu.getId().equals(alvo.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode denunciar a si mesmo");
        }
        Denuncia d = new Denuncia();
        d.setDenuncianteId(eu.getId());
        d.setDenunciadoId(alvo.getId());
        d.setMotivo(req.motivo());
        d.setDescricao(req.descricao() == null || req.descricao().isBlank() ? null : req.descricao().trim());
        return repository.save(d);
    }

    public List<Denuncia> listar() {
        return repository.findAll();
    }

    public Denuncia marcarComoAnalisada(Long id) {
        Denuncia d = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Denúncia não encontrada"));
        d.setStatus(StatusDenuncia.ANALISADA);
        return repository.save(d);
    }
}
