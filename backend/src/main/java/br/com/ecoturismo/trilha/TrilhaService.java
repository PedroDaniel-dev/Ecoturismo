package br.com.ecoturismo.trilha;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.com.ecoturismo.trilha.dto.FaixaDuracao;
import br.com.ecoturismo.trilha.dto.ImagemDto;
import br.com.ecoturismo.trilha.dto.TrilhaRequest;

@Service
@Transactional
public class TrilhaService {

    private final TrilhaRepository repository;

    public TrilhaService(TrilhaRepository repository) {
        this.repository = repository;
    }

    /**
     * Busca do catálogo: texto livre + dificuldade(s) + zona(s) + faixa de duração. Todos opcionais.
     * O catálogo é pequeno (dezenas de trilhas), então filtra em memória para manter a busca sem acento.
     */
    @Transactional(readOnly = true)
    public List<Trilha> buscar(String texto, List<Dificuldade> dificuldades, List<Zona> zonas, FaixaDuracao duracao) {
        String q = normalizar(texto);
        return repository.findAll().stream()
                .filter(t -> q.isEmpty() || normalizar(t.getNome() + " " + t.getLocalizacao() + " " + t.getZona().getLabel()
                        + " " + (t.getParque() == null ? "" : t.getParque())).contains(q))
                .filter(t -> dificuldades == null || dificuldades.isEmpty() || dificuldades.contains(t.getDificuldade()))
                .filter(t -> zonas == null || zonas.isEmpty() || zonas.contains(t.getZona()))
                .filter(t -> duracao == null || duracao.contem(t.getDuracaoMinutos()))
                .sorted(Comparator.comparing(Trilha::getNome))
                .toList();
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

    public void garantirQueExiste(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trilha não encontrada");
        }
    }

    public Trilha criar(TrilhaRequest req) {
        Trilha t = new Trilha();
        aplicar(t, req);
        return repository.save(t);
    }

    public Trilha atualizar(Long id, TrilhaRequest req) {
        Trilha t = buscarPorId(id);
        aplicar(t, req);
        return repository.save(t);
    }

    public void remover(Long id) {
        garantirQueExiste(id);
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
