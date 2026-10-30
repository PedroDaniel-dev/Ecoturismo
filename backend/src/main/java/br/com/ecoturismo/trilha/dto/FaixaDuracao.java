package br.com.ecoturismo.trilha.dto;

/** Faixas usadas no filtro de duração do catálogo. Trilha sem duração conhecida não entra em nenhuma. */
public enum FaixaDuracao {
    CURTA,   // até 2h
    MEDIA,   // mais de 2h até 4h
    LONGA;   // mais de 4h

    public boolean contem(Integer minutos) {
        if (minutos == null) return false;
        return switch (this) {
            case CURTA -> minutos <= 120;
            case MEDIA -> minutos > 120 && minutos <= 240;
            case LONGA -> minutos > 240;
        };
    }
}
