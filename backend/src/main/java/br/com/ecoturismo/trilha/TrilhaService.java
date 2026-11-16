package br.com.ecoturismo.trilha;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.trilha.dto.FaixaDuracao;
import br.com.ecoturismo.trilha.dto.ImagemDto;
import br.com.ecoturismo.trilha.dto.TrilhaRequest;
import br.com.ecoturismo.trilha.dto.TrilhaResponse;

@Service
@Transactional
public class TrilhaService {

    private final TrilhaRepository repository;

    /** Catálogo pronto para a busca; null = recarregar do banco na próxima busca. */
    private volatile Catalogo catalogo;

    private record ItemCatalogo(TrilhaResponse resposta, String texto, Dificuldade dificuldade, Zona zona, Integer duracaoMinutos) {}

    private record Catalogo(List<ItemCatalogo> itens, Set<Long> ids) {}

    public TrilhaService(TrilhaRepository repository) {
        this.repository = repository;
    }

    /**
     * Busca do catálogo: texto livre + dificuldade(s) + zona(s) + faixa de duração. Todos opcionais.
     * O catálogo é pequeno (dezenas de trilhas) e quase não muda, então fica em memória já convertido para a resposta
     * e com o texto de busca sem acento; só volta ao banco depois que uma trilha é criada, alterada ou removida.
     */
    @Transactional(propagation = Propagation.SUPPORTS)
    public List<TrilhaResponse> buscar(String texto, List<Dificuldade> dificuldades, List<Zona> zonas, FaixaDuracao duracao) {
        String q = normalizar(texto);
        return catalogo().itens().stream()
                .filter(t -> q.isEmpty() || t.texto().contains(q))
                .filter(t -> dificuldades == null || dificuldades.isEmpty() || dificuldades.contains(t.dificuldade()))
                .filter(t -> zonas == null || zonas.isEmpty() || zonas.contains(t.zona()))
                .filter(t -> duracao == null || duracao.contem(t.duracaoMinutos()))
                .map(ItemCatalogo::resposta)
                .toList();
    }

    private Catalogo catalogo() {
        Catalogo c = catalogo;
        if (c == null) {
            List<ItemCatalogo> itens = repository.findAllComImagens().stream()
                    .sorted(Comparator.comparing(Trilha::getNome))
                    .map(t -> new ItemCatalogo(TrilhaResponse.de(t),
                            normalizar(t.getNome() + " " + t.getLocalizacao() + " " + t.getZona().getLabel()
                                    + " " + (t.getParque() == null ? "" : t.getParque())),
                            t.getDificuldade(), t.getZona(), t.getDuracaoMinutos()))
                    .toList();
            c = new Catalogo(itens, itens.stream().map(i -> i.resposta().id()).collect(Collectors.toUnmodifiableSet()));
            catalogo = c;
        }
        return c;
    }

    /** Descarta o catálogo em memória quando a transação que mexeu nas trilhas for confirmada. */
    private void descartarCatalogoAposCommit() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    catalogo = null;
                }
            });
        } else {
            catalogo = null;
        }
    }

    @Transactional(readOnly = true)
    public List<Trilha> destaques() {
        return repository.findByDestaqueTrueOrderByNome();
    }

    @Transactional(readOnly = true)
    public Trilha buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trilha não encontrada"));
    }

    @Transactional(propagation = Propagation.SUPPORTS)
    public void garantirQueExiste(Long id) {
        if (!catalogo().ids().contains(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trilha não encontrada");
        }
    }

    public Trilha criar(TrilhaRequest req) {
        Trilha t = new Trilha();
        aplicar(t, req);
        descartarCatalogoAposCommit();
        return repository.save(t);
    }

    public Trilha atualizar(Long id, TrilhaRequest req) {
        Trilha t = buscarPorId(id);
        aplicar(t, req);
        descartarCatalogoAposCommit();
        return repository.save(t);
    }

    public void remover(Long id) {
        garantirQueExiste(id);
        descartarCatalogoAposCommit();
        repository.deleteById(id);
    }

    private void aplicar(Trilha t, TrilhaRequest r) {
        t.setNome(r.nome().trim());
        t.setLocalizacao(r.localizacao().trim());
        t.setParque(r.parque());
        t.setZona(r.zona());
        t.setLatitude(r.latitude());
        t.setLongitude(r.longitude());
        t.setTaxa(r.taxa() != null ? r.taxa() : BigDecimal.ZERO);
        t.setHorarioAbertura(r.horarioAbertura());
        t.setHorarioFechamento(r.horarioFechamento());
        t.setObservacaoHorario(r.observacaoHorario());
        t.setDificuldade(r.dificuldade());
        t.setDistancia(r.distancia() != null ? r.distancia() : BigDecimal.ZERO);
        t.setDuracaoMinutos(r.duracaoMinutos());
        t.setAltitude(r.altitude());
        t.setTipoPercurso(r.tipoPercurso());
        t.setTipoAtividade(r.tipoAtividade());
        t.setSituacao(r.situacao() != null ? r.situacao() : SituacaoTrilha.ABERTA);
        t.setDescricaoCurta(r.descricaoCurta());
        t.setDescricao(r.descricao());
        t.setComoChegar(r.comoChegar());
        List<ImagemTrilha> imagens = new ArrayList<>();
        if (r.imagens() != null) for (ImagemDto i : r.imagens()) imagens.add(new ImagemTrilha(i.url(), i.creditoUrl()));
        t.setImagens(imagens);
        t.setDestaque(r.destaque());
    }

    private static String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
