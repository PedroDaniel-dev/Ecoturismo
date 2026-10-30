package br.com.ecoturismo.denuncia;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Denúncia de um usuário contra outro, para a moderação (ADMIN) analisar. */
@Entity
@Table(name = "DENUNCIA")
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idDenuncia")
    private Long id;
    @Column(name = "idDenunciante")
    private Long denuncianteId;
    @Column(name = "idDenunciado")
    private Long denunciadoId;
    @Enumerated(EnumType.STRING)
    private MotivoDenuncia motivo;
    private String descricao;
    @Enumerated(EnumType.STRING)
    private StatusDenuncia status = StatusDenuncia.ABERTA;
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDenuncianteId() { return denuncianteId; }
    public void setDenuncianteId(Long denuncianteId) { this.denuncianteId = denuncianteId; }
    public Long getDenunciadoId() { return denunciadoId; }
    public void setDenunciadoId(Long denunciadoId) { this.denunciadoId = denunciadoId; }
    public MotivoDenuncia getMotivo() { return motivo; }
    public void setMotivo(MotivoDenuncia motivo) { this.motivo = motivo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public StatusDenuncia getStatus() { return status; }
    public void setStatus(StatusDenuncia status) { this.status = status; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
