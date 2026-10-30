package br.com.ecoturismo.recuperacaosenha;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.ecoturismo.recuperacaosenha.dto.EsqueciSenhaRequest;
import br.com.ecoturismo.recuperacaosenha.dto.RedefinirSenhaRequest;
import jakarta.validation.Valid;

/** Fica em /api/auth, que é público: quem esqueceu a senha não está logado. */
@RestController
@RequestMapping("/api/auth")
public class RecuperacaoSenhaController {

    private final RecuperacaoSenhaService service;

    public RecuperacaoSenhaController(RecuperacaoSenhaService service) {
        this.service = service;
    }

    /** Sempre 204, exista ou não uma conta com o e-mail. */
    @PostMapping("/esqueci-senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void esqueci(@Valid @RequestBody EsqueciSenhaRequest req) {
        service.solicitar(req.email());
    }

    @PostMapping("/redefinir-senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinir(@Valid @RequestBody RedefinirSenhaRequest req) {
        service.redefinir(req.token(), req.novaSenha());
    }
}
