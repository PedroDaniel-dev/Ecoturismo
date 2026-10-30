package br.com.ecoturismo.bloqueio;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Um usuário bloqueou outro: o bloqueado deixa de ver o perfil de quem bloqueou e ninguém segue ninguém. */
@Entity
@Table(name = "BLOQUEIO")
public class Bloqueio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idBloqueio")
    private Long id;
    @Column(name = "idBloqueador")
    private Long bloqueadorId;
    @Column(name = "idBloqueado")
    private Long bloqueadoId;
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getBloqueadorId() { return bloqueadorId; }
    public void setBloqueadorId(Long bloqueadorId) { this.bloqueadorId = bloqueadorId; }
    public Long getBloqueadoId() { return bloqueadoId; }
    public void setBloqueadoId(Long bloqueadoId) { this.bloqueadoId = bloqueadoId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
