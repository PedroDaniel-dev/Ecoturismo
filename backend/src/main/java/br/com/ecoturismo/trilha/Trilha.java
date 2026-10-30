package br.com.ecoturismo.trilha;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

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
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

/**
 * Trilha do catálogo. Horários vazios = acesso 24 horas; distância 0 = ainda não se sabe;
 * duração e altitude podem ser null.
 */
@Entity
@Table(name = "TRILHA")
public class Trilha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idTrilha")
    private Long id;
    private String nome;
    private String localizacao;
    private String parque;
    @Enumerated(EnumType.STRING)
    private Zona zona;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal taxa = BigDecimal.ZERO;
    private LocalTime horarioAbertura;
    private LocalTime horarioFechamento;
    private String observacaoHorario;
    @Enumerated(EnumType.STRING)
    private Dificuldade dificuldade;
    /** km, ida e volta (ou o percurso inteiro, no circuito e na travessia) */
    private BigDecimal distancia = BigDecimal.ZERO;
    private Integer duracaoMinutos;
    /** m */
    private Integer altitude;
    @Enumerated(EnumType.STRING)
    private TipoPercurso tipoPercurso;
    @Enumerated(EnumType.STRING)
    private TipoAtividade tipoAtividade;
    @Enumerated(EnumType.STRING)
    private SituacaoTrilha situacao = SituacaoTrilha.ABERTA;
    private String descricaoCurta;
    private String descricao;
    private String comoChegar;
    private boolean destaque;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "TRILHA_IMAGEM", joinColumns = @JoinColumn(name = "idTrilha"))
    @OrderColumn(name = "ordem")
    private List<ImagemTrilha> imagens = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getLocalizacao() { return localizacao; }
    public void setLocalizacao(String localizacao) { this.localizacao = localizacao; }
    public String getParque() { return parque; }
    public void setParque(String parque) { this.parque = parque; }
    public Zona getZona() { return zona; }
    public void setZona(Zona zona) { this.zona = zona; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public BigDecimal getTaxa() { return taxa; }
    public void setTaxa(BigDecimal taxa) { this.taxa = taxa; }
    public LocalTime getHorarioAbertura() { return horarioAbertura; }
    public void setHorarioAbertura(LocalTime horarioAbertura) { this.horarioAbertura = horarioAbertura; }
    public LocalTime getHorarioFechamento() { return horarioFechamento; }
    public void setHorarioFechamento(LocalTime horarioFechamento) { this.horarioFechamento = horarioFechamento; }
    public String getObservacaoHorario() { return observacaoHorario; }
    public void setObservacaoHorario(String observacaoHorario) { this.observacaoHorario = observacaoHorario; }
    public Dificuldade getDificuldade() { return dificuldade; }
    public void setDificuldade(Dificuldade dificuldade) { this.dificuldade = dificuldade; }
    public BigDecimal getDistancia() { return distancia; }
    public void setDistancia(BigDecimal distancia) { this.distancia = distancia; }
    public Integer getDuracaoMinutos() { return duracaoMinutos; }
    public void setDuracaoMinutos(Integer duracaoMinutos) { this.duracaoMinutos = duracaoMinutos; }
    public Integer getAltitude() { return altitude; }
    public void setAltitude(Integer altitude) { this.altitude = altitude; }
    public TipoPercurso getTipoPercurso() { return tipoPercurso; }
    public void setTipoPercurso(TipoPercurso tipoPercurso) { this.tipoPercurso = tipoPercurso; }
    public TipoAtividade getTipoAtividade() { return tipoAtividade; }
    public void setTipoAtividade(TipoAtividade tipoAtividade) { this.tipoAtividade = tipoAtividade; }
    public SituacaoTrilha getSituacao() { return situacao; }
    public void setSituacao(SituacaoTrilha situacao) { this.situacao = situacao; }
    public String getDescricaoCurta() { return descricaoCurta; }
    public void setDescricaoCurta(String descricaoCurta) { this.descricaoCurta = descricaoCurta; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getComoChegar() { return comoChegar; }
    public void setComoChegar(String comoChegar) { this.comoChegar = comoChegar; }
    public boolean isDestaque() { return destaque; }
    public void setDestaque(boolean destaque) { this.destaque = destaque; }
    public List<ImagemTrilha> getImagens() { return imagens; }
    public void setImagens(List<ImagemTrilha> imagens) { this.imagens = imagens; }
}
