package br.com.ecoturismo.trilha;

public enum Zona {
    SUL("Zona Sul"),
    NORTE("Zona Norte"),
    OESTE("Zona Oeste"),
    CENTRO("Centro"),
    FORA_DO_RIO("Fora do Rio");

    private final String label;

    Zona(String label) { this.label = label; }

    public String getLabel() { return label; }
}
