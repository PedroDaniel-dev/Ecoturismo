package br.com.ecoturismo.usuario;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import br.com.ecoturismo.config.ImagemStorage;

/** Fotos de perfil: o nome do arquivo leva o id do dono, então um usuário nunca apaga a foto de outro. */
@Service
public class FotoPerfilStorage {

    private final ImagemStorage imagens;

    public FotoPerfilStorage(ImagemStorage imagens) {
        this.imagens = imagens;
    }

    public String salvar(Long usuarioId, MultipartFile arquivo) {
        return imagens.salvar(prefixo(usuarioId), arquivo);
    }

    public void remover(Long usuarioId, String url) {
        imagens.remover(prefixo(usuarioId), url);
    }

    private static String prefixo(Long usuarioId) {
        return "usuario-" + usuarioId + "-";
    }
}
