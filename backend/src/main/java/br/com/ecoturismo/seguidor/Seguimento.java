package br.com.ecoturismo.seguidor;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Um usuário seguindo outro. Não precisa de aceite: é uma relação de mão única. */
@Entity
@Table(name = "SEGUIMENTO")
public class Seguimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idSeguimento")
    private Long id;
    @Column(name = "idSeguidor")
    private Long seguidorId;
    @Column(name = "idSeguido")
    private Long seguidoId;
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSeguidorId() { return seguidorId; }
    public void setSeguidorId(Long seguidorId) { this.seguidorId = seguidorId; }
    public Long getSeguidoId() { return seguidoId; }
    public void setSeguidoId(Long seguidoId) { this.seguidoId = seguidoId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
