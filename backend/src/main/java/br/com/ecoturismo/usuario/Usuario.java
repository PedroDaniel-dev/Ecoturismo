package br.com.ecoturismo.usuario;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "USUARIO")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idUsuario")
    private Long id;
    private String cpf;
    private String nome;
    private String email;
    @Column(name = "senha")
    private String senhaHash;
    private LocalDate dataNascimento;
    private String telefone;
    private String fotoUrl;
    private String bio;
    @Enumerated(EnumType.STRING)
    @Column(name = "papel")
    private Role role = Role.USER;
    /** Sobe a cada troca ou recuperação de senha; tokens JWT com versão antiga deixam de valer. */
    private int versaoToken = 0;
    // poucas por usuário e lidas em quase toda resposta, então vêm junto
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "CURTIDA", joinColumns = @JoinColumn(name = "idUsuario"))
    @Column(name = "idTrilha")
    private Set<Long> trilhasCurtidas = new LinkedHashSet<>();
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Usuario() {}

    public Usuario(String nome, String email, String senhaHash, LocalDate dataNascimento, Role role) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.dataNascimento = dataNascimento;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate dataNascimento) { this.dataNascimento = dataNascimento; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public int getVersaoToken() { return versaoToken; }
    public void setVersaoToken(int versaoToken) { this.versaoToken = versaoToken; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Set<Long> getTrilhasCurtidas() { return trilhasCurtidas; }
    public void setTrilhasCurtidas(Set<Long> trilhasCurtidas) { this.trilhasCurtidas = trilhasCurtidas; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
