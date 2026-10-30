package br.com.ecoturismo.recuperacaosenha;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Pedido de "esqueci minha senha". Guarda só o hash do token: quem ler os dados não consegue usar o link. */
@Entity
@Table(name = "RECUPERACAO_SENHA")
public class RecuperacaoSenha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idRecuperacao")
    private Long id;
    @Column(name = "idUsuario")
    private Long usuarioId;
    private String tokenHash;
    private LocalDateTime criadoEm = LocalDateTime.now();
    private LocalDateTime expiraEm;
    private LocalDateTime usadoEm;

    public boolean valido(LocalDateTime agora) {
        return usadoEm == null && expiraEm.isAfter(agora);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
    public LocalDateTime getExpiraEm() { return expiraEm; }
    public void setExpiraEm(LocalDateTime expiraEm) { this.expiraEm = expiraEm; }
    public LocalDateTime getUsadoEm() { return usadoEm; }
    public void setUsadoEm(LocalDateTime usadoEm) { this.usadoEm = usadoEm; }
}
