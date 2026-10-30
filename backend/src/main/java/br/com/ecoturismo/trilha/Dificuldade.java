package br.com.ecoturismo.trilha;

/** No banco é MEDIO; na tela aparece "Moderado". */
public enum Dificuldade {
    FACIL("Fácil"),
    MEDIO("Moderado"),
    DIFICIL("Difícil");

    private final String label;

    Dificuldade(String label) { this.label = label; }

    public String getLabel() { return label; }
}
