package br.com.ecoturismo.avisoperigo;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Contribuições enviadas pelo formulário "Quer sugerir uma trilha ou reportar um problema?", sempre por um usuário logado:
 * sugestão de trilha nova, problema no catálogo ou aviso de perigo na trilha. Trilha e visita são opcionais.
 */
@Entity
@Table(name = "AVISO_PERIGO")
public class AvisoPerigo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idAviso")
    private Long id;
    @Enumerated(EnumType.STRING)
    private TipoAviso tipo;
    @Enumerated(EnumType.STRING)
    private StatusAviso status = StatusAviso.ATIVO;
    private String mensagem;
    /** nome ou local da trilha como a pessoa escreveu (a trilha pode nem estar no catálogo) */
    private String trilhaTexto;
    @Column(name = "idTrilha")
    private Long trilhaId;
    @Column(name = "idVisita")
    private Long visitaId;
    @Column(name = "idUsuario")
    private Long usuarioId;
    @Column(name = "dataHoraEmissao")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public TipoAviso getTipo() { return tipo; }
    public void setTipo(TipoAviso tipo) { this.tipo = tipo; }
    public StatusAviso getStatus() { return status; }
    public void setStatus(StatusAviso status) { this.status = status; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getTrilhaTexto() { return trilhaTexto; }
    public void setTrilhaTexto(String trilhaTexto) { this.trilhaTexto = trilhaTexto; }
    public Long getTrilhaId() { return trilhaId; }
    public void setTrilhaId(Long trilhaId) { this.trilhaId = trilhaId; }
    public Long getVisitaId() { return visitaId; }
    public void setVisitaId(Long visitaId) { this.visitaId = visitaId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
