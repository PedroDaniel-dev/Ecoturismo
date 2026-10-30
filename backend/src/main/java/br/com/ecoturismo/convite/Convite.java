package br.com.ecoturismo.convite;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Convite para um usuário entrar em uma party. Um por pessoa por party (UNIQUE no banco): convidar de novo reaproveita o registro. */
@Entity
@Table(name = "CONVITE")
public class Convite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idConvite")
    private Long id;
    @Column(name = "idParty")
    private Long partyId;
    @Column(name = "idRemetente")
    private Long remetenteId;
    @Column(name = "idConvidado")
    private Long destinatarioId;
    @Enumerated(EnumType.STRING)
    private StatusConvite status = StatusConvite.PENDENTE;
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPartyId() { return partyId; }
    public void setPartyId(Long partyId) { this.partyId = partyId; }
    public Long getRemetenteId() { return remetenteId; }
    public void setRemetenteId(Long remetenteId) { this.remetenteId = remetenteId; }
    public Long getDestinatarioId() { return destinatarioId; }
    public void setDestinatarioId(Long destinatarioId) { this.destinatarioId = destinatarioId; }
    public StatusConvite getStatus() { return status; }
    public void setStatus(StatusConvite status) { this.status = status; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
