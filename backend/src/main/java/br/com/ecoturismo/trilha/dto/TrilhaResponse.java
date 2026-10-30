package br.com.ecoturismo.trilha.dto;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import br.com.ecoturismo.trilha.Trilha;

public record TrilhaResponse(
        Long id, String nome, String localizacao, String parque,
        String zona, String zonaLabel,
        BigDecimal latitude, BigDecimal longitude,
        BigDecimal taxa, LocalTime horarioAbertura, LocalTime horarioFechamento, String observacaoHorario,
        String dificuldade, String dificuldadeLabel,
        BigDecimal distancia, Integer duracaoMinutos, Integer altitude,
        String tipoPercurso, String tipoAtividade, String situacao,
        String descricaoCurta, String descricao, String comoChegar,
        List<ImagemDto> imagens, boolean destaque
) {
    public static TrilhaResponse de(Trilha t) {
        return new TrilhaResponse(t.getId(), t.getNome(), t.getLocalizacao(), t.getParque(),
                t.getZona().name(), t.getZona().getLabel(),
                t.getLatitude(), t.getLongitude(),
                t.getTaxa(), t.getHorarioAbertura(), t.getHorarioFechamento(), t.getObservacaoHorario(),
                t.getDificuldade().name(), t.getDificuldade().getLabel(),
                t.getDistancia(), t.getDuracaoMinutos(), t.getAltitude(),
                t.getTipoPercurso().name(), t.getTipoAtividade().name(), t.getSituacao().name(),
                t.getDescricaoCurta(), t.getDescricao(), t.getComoChegar(),
                t.getImagens().stream().map(ImagemDto::de).toList(), t.isDestaque());
    }
}
