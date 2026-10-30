package br.com.ecoturismo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Envio de e-mail. Por enquanto só escreve no log do backend: o link de recuperação de senha aparece no console.
 * Para enviar de verdade: adicione spring-boot-starter-mail ao pom.xml, configure spring.mail.* e troque o corpo
 * de enviar() por um JavaMailSender (SimpleMailMessage com para, assunto e texto).
 */
@Service
public class EnvioEmail {

    private static final Logger log = LoggerFactory.getLogger(EnvioEmail.class);

    public void enviar(String para, String assunto, String texto) {
        log.info("E-mail (não enviado, só no log) para {} | {}\n{}", para, assunto, texto);
    }
}
