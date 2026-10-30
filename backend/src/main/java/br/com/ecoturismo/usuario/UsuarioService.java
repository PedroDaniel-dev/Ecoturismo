package br.com.ecoturismo.usuario;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.usuario.dto.UsuarioUpdateRequest;

@Service
@Transactional
public class UsuarioService {

    private final UsuarioRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final FotoPerfilStorage fotos;

    public UsuarioService(UsuarioRepository repository, PasswordEncoder passwordEncoder, FotoPerfilStorage fotos) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.fotos = fotos;
    }

    public Usuario cadastrar(String nome, String email, String senha, LocalDate dataNascimento) {
        if (repository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        Usuario u = new Usuario(nome.trim(), email.trim().toLowerCase(), passwordEncoder.encode(senha), dataNascimento, Role.USER);
        return repository.save(u);
    }

    public Usuario criarAdminSeNaoExistir(String email, String senha, LocalDate dataNascimento) {
        return repository.findByEmail(email).orElseGet(() ->
                repository.save(new Usuario("Administrador", email, passwordEncoder.encode(senha), dataNascimento, Role.ADMIN)));
    }

    public Usuario criarUsuarioSeNaoExistir(String nome, String email, String senha, LocalDate dataNascimento) {
        return repository.findByEmail(email).orElseGet(() ->
                repository.save(new Usuario(nome, email, passwordEncoder.encode(senha), dataNascimento, Role.USER)));
    }

    @Transactional(readOnly = true)
    public Usuario buscarPorEmail(String email) {
        return repository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
    }

    public Usuario buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
    }

    public List<Usuario> listar() {
        return repository.findAll();
    }

    public Usuario atualizar(String email, UsuarioUpdateRequest req) {
        Usuario u = buscarPorEmail(email);
        if (req.nome() != null && !req.nome().isBlank()) u.setNome(req.nome().trim());
        if (req.bio() != null) u.setBio(req.bio().isBlank() ? null : req.bio().trim());
        if (req.telefone() != null) u.setTelefone(req.telefone().isBlank() ? null : req.telefone().trim());
        if (req.dataNascimento() != null) u.setDataNascimento(req.dataNascimento());
        if (req.fotoUrl() != null) {
            String antiga = u.getFotoUrl();
            u.setFotoUrl(req.fotoUrl().isBlank() ? null : req.fotoUrl().trim());
            if (!Objects.equals(antiga, u.getFotoUrl())) fotos.remover(u.getId(), antiga);
        }
        return repository.save(u);
    }

    public Usuario atualizarFoto(String email, MultipartFile arquivo) {
        Usuario u = buscarPorEmail(email);
        String antiga = u.getFotoUrl();
        u.setFotoUrl(fotos.salvar(u.getId(), arquivo));
        fotos.remover(u.getId(), antiga);
        return repository.save(u);
    }

    public Usuario removerFoto(String email) {
        Usuario u = buscarPorEmail(email);
        fotos.remover(u.getId(), u.getFotoUrl());
        u.setFotoUrl(null);
        return repository.save(u);
    }

    /** Troca de senha pelo próprio usuário, confirmando a atual. */
    public Usuario trocarSenha(String email, String senhaAtual, String novaSenha) {
        Usuario u = buscarPorEmail(email);
        if (!passwordEncoder.matches(senhaAtual, u.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        }
        if (passwordEncoder.matches(novaSenha, u.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ser diferente da atual");
        }
        return definirSenha(u, novaSenha);
    }

    /** Grava a nova senha e invalida todos os tokens emitidos antes (troca e recuperação de senha). */
    public Usuario definirSenha(Usuario u, String novaSenha) {
        u.setSenhaHash(passwordEncoder.encode(novaSenha));
        u.setVersaoToken(u.getVersaoToken() + 1);
        return repository.save(u);
    }

    /** Alterna a curtida e devolve true se a trilha ficou curtida. */
    public boolean alternarCurtida(String email, Long trilhaId) {
        Usuario u = buscarPorEmail(email);
        boolean curtiu = u.getTrilhasCurtidas().add(trilhaId);
        if (!curtiu) u.getTrilhasCurtidas().remove(trilhaId);
        repository.save(u);
        return curtiu;
    }
}
