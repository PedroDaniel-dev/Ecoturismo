package br.com.ecoturismo.party;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/** Grupo de usuários que vai fazer uma trilha junto. O líder (criador) é sempre membro. */
@Entity
@Table(name = "PARTY")
public class Party {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idParty")
    private Long id;
    private String nome;
    private String descricao;
    @Column(name = "idTrilha")
    private Long trilhaId;
    private LocalDate data;
    private LocalTime horario;
    /** Começa como quem criou; passa para outro membro se o líder sair. */
    @Column(name = "idCriador")
    private Long liderId;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "PARTY_MEMBRO", joinColumns = @JoinColumn(name = "idParty"))
    @Column(name = "idUsuario")
    private Set<Long> membros = new LinkedHashSet<>();
    private LocalDateTime criadoEm = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Long getTrilhaId() { return trilhaId; }
    public void setTrilhaId(Long trilhaId) { this.trilhaId = trilhaId; }
    public LocalDate getData() { return data; }
    public void setData(LocalDate data) { this.data = data; }
    public LocalTime getHorario() { return horario; }
    public void setHorario(LocalTime horario) { this.horario = horario; }
    public Long getLiderId() { return liderId; }
    public void setLiderId(Long liderId) { this.liderId = liderId; }
    public Set<Long> getMembros() { return membros; }
    public void setMembros(Set<Long> membros) { this.membros = membros; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
