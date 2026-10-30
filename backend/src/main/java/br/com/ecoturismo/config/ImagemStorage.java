package br.com.ecoturismo.config;

import static java.nio.charset.StandardCharsets.US_ASCII;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda imagens enviadas (fotos de perfil e de trilhas) numa pasta local e as serve em /api/fotos/**
 * (ver UploadsConfig). As entidades guardam só a URL, então trocar por S3/Cloudinary no futuro não muda o resto.
 * O tamanho máximo é definido em spring.servlet.multipart.max-file-size.
 */
@Component
public class ImagemStorage {

    public static final String URL_BASE = "/api/fotos/";
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private final Path pasta;

    public ImagemStorage(@Value("${app.uploads.dir}") String pasta) {
        this.pasta = Path.of(pasta).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.pasta);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível criar a pasta de uploads " + this.pasta, e);
        }
    }

    public Path getPasta() {
        return pasta;
    }

    /** Salva a imagem com um nome que começa pelo prefixo e devolve a URL pública dela. */
    public String salvar(String prefixo, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie uma imagem");
        }
        byte[] bytes;
        try {
            bytes = arquivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível ler a imagem");
        }
        String extensao = extensao(bytes);
        if (extensao == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Use uma imagem JPG, PNG ou WebP");
        }

        String nome = prefixo + UUID.randomUUID() + "." + extensao;
        try {
            Files.write(pasta.resolve(nome), bytes);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível salvar a imagem");
        }
        return URL_BASE + nome;
    }

    /**
     * Apaga a imagem se a URL for daqui e o nome começar com o prefixo. O prefixo leva o id do dono,
     * então um usuário nunca apaga o arquivo de outro (o fotoUrl também pode ser definido à mão).
     */
    public void remover(String prefixo, String url) {
        if (url == null || !url.startsWith(URL_BASE)) return;
        String nome = url.substring(URL_BASE.length());
        if (!nome.startsWith(prefixo)) return;
        Path arquivo = pasta.resolve(nome).normalize();
        if (!pasta.equals(arquivo.getParent())) return;
        try {
            Files.deleteIfExists(arquivo);
        } catch (IOException e) {
            // fica um arquivo órfão na pasta, sem efeito para o usuário
        }
    }

    // Confere a assinatura do arquivo em vez de confiar no Content-Type enviado pelo navegador.
    private static String extensao(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8), PNG)) return "png";
        if (b.length >= 12 && new String(b, 0, 4, US_ASCII).equals("RIFF") && new String(b, 8, 4, US_ASCII).equals("WEBP")) return "webp";
        return null;
    }
}
