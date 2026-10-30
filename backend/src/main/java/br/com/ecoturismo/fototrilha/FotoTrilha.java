package br.com.ecoturismo.fototrilha;

import java.time.LocalDateTime;

import br.com.ecoturismo.visita.Visita;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Foto que um usuário tirou numa trilha. Pertence a uma visita (tabela FOTO), que diz quem foi e a qual trilha. */
@Entity
@Table(name = "FOTO")
public class FotoTrilha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idFoto")
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "idVisita")
    private Visita visita;
    private String url;
    private String legenda;
    @Column(name = "dataEnvio")
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getUsuarioId() { return visita.getUsuarioId(); }
    public Long getTrilhaId() { return visita.getTrilhaId(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Visita getVisita() { return visita; }
    public void setVisita(Visita visita) { this.visita = visita; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getLegenda() { return legenda; }
    public void setLegenda(String legenda) { this.legenda = legenda; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
