package br.com.ecoturismo.visita;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Registro de uma ida (planejada, concluída ou cancelada) de um usuário a uma trilha.
 * Nota (de 0,5 em 0,5 até 5) e comentário só existem nas concluídas; é isso que aparece como avaliação.
 */
@Entity
@Table(name = "VISITA")
public class Visita {

    /** Mais recentes primeiro: pela data da visita e, empatando, por quando foi registrada. */
    public static final Comparator<Visita> RECENTES = Comparator
            .comparing(Visita::getData)
            .thenComparing(Visita::getCriadoEm)
            .reversed();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idVisita")
    private Long id;
    @Column(name = "idUsuario")
    private Long usuarioId;
    @Column(name = "idTrilha")
    private Long trilhaId;
    private LocalDate data;
    @Enumerated(EnumType.STRING)
    private StatusVisita status = StatusVisita.PLANEJADA;
    @Column(name = "nota")
    private BigDecimal avaliacao;
    private String comentario;
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getTrilhaId() { return trilhaId; }
    public void setTrilhaId(Long trilhaId) { this.trilhaId = trilhaId; }
    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }
    public StatusVisita getStatus() { return status; }
    public void setStatus(StatusVisita status) { this.status = status; }
    public BigDecimal getAvaliacao() { return avaliacao; }
    public void setAvaliacao(BigDecimal avaliacao) { this.avaliacao = avaliacao; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
