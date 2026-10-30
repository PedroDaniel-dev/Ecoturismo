package br.com.ecoturismo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Serve as imagens enviadas. Fica sob /api para passar pelo proxy do Vite. */
@Configuration
public class UploadsConfig implements WebMvcConfigurer {

    private final ImagemStorage storage;

    public UploadsConfig(ImagemStorage storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String local = storage.getPasta().toUri().toString();
        registry.addResourceHandler(ImagemStorage.URL_BASE + "**")
                .addResourceLocations(local.endsWith("/") ? local : local + "/")
                // cada envio gera um nome novo, então o navegador pode guardar a imagem por bastante tempo
                .setCachePeriod(60 * 60 * 24 * 30);
    }
}
