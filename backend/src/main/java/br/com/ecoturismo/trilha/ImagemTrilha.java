package br.com.ecoturismo.trilha;

import jakarta.persistence.Embeddable;

/** Foto do catálogo (tabela TRILHA_IMAGEM). creditoUrl aponta para a página de autoria e licença. */
@Embeddable
public class ImagemTrilha {

    private String url;
    private String creditoUrl;

    public ImagemTrilha() {}

    public ImagemTrilha(String url, String creditoUrl) {
        this.url = url;
        this.creditoUrl = creditoUrl;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getCreditoUrl() { return creditoUrl; }
    public void setCreditoUrl(String creditoUrl) { this.creditoUrl = creditoUrl; }
}
