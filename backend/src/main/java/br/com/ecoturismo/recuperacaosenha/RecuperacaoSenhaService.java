package br.com.ecoturismo.recuperacaosenha;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.config.EnvioEmail;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioRepository;
import br.com.ecoturismo.usuario.UsuarioService;

/**
 * "Esqueci minha senha": manda por e-mail um link de uso único que vale por 30 minutos.
 * Só o pedido mais recente de cada usuário vale; redefinir a senha derruba as sessões abertas (UsuarioService.definirSenha).
 */
@Service
@Transactional
public class RecuperacaoSenhaService {

    private static final Duration VALIDADE = Duration.ofMinutes(30);
    // evita que alguém dispare vários e-mails seguidos para a mesma pessoa
    private static final Duration INTERVALO_MINIMO = Duration.ofMinutes(1);

    private final RecuperacaoSenhaRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final EnvioEmail envioEmail;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();

    public RecuperacaoSenhaService(RecuperacaoSenhaRepository repository, UsuarioRepository usuarioRepository,
                                   UsuarioService usuarioService, EnvioEmail envioEmail,
                                   @Value("${app.frontend-url}") String frontendUrl) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.envioEmail = envioEmail;
        this.frontendUrl = frontendUrl;
    }

    /** Não informa se o e-mail tem conta: a resposta é a mesma nos dois casos, para ninguém descobrir quem usa o site. */
    public void solicitar(String email) {
        Usuario u = usuarioRepository.findByEmail(email).orElse(null);
        if (u == null) return;

        LocalDateTime agora = LocalDateTime.now();
        List<RecuperacaoSenha> anteriores = repository.findByUsuarioId(u.getId());
        if (anteriores.stream().anyMatch(r -> r.valido(agora) && r.getCriadoEm().isAfter(agora.minus(INTERVALO_MINIMO)))) return;
        anteriores.forEach(r -> repository.deleteById(r.getId()));

        String token = novoToken();
        RecuperacaoSenha r = new RecuperacaoSenha();
        r.setUsuarioId(u.getId());
        r.setTokenHash(hash(token));
        r.setExpiraEm(agora.plus(VALIDADE));
        repository.save(r);

        envioEmail.enviar(u.getEmail(), "Redefinir sua senha · Ecoturismo Rio",
                "Olá, " + u.getNome() + "!\n\n"
                + "Para criar uma nova senha, abra o link abaixo. Ele vale por " + VALIDADE.toMinutes() + " minutos e só pode ser usado uma vez:\n"
                + frontendUrl + "/redefinir-senha?token=" + token + "\n\n"
                + "Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.");
    }

    public void redefinir(String token, String novaSenha) {
        LocalDateTime agora = LocalDateTime.now();
        RecuperacaoSenha r = repository.findByTokenHash(hash(token))
                .filter(x -> x.valido(agora))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link inválido ou expirado. Peça um novo."));
        usuarioService.definirSenha(usuarioService.buscarPorId(r.getUsuarioId()), novaSenha);
        r.setUsadoEm(agora);
        repository.save(r);
    }

    private String novoToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
