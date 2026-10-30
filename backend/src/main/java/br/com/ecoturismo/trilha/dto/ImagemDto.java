package br.com.ecoturismo.trilha.dto;

import br.com.ecoturismo.trilha.ImagemTrilha;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ImagemDto(@NotBlank @Size(max = 500) String url, @Size(max = 500) String creditoUrl) {

    public static ImagemDto de(ImagemTrilha i) {
        return new ImagemDto(i.getUrl(), i.getCreditoUrl());
    }
}
