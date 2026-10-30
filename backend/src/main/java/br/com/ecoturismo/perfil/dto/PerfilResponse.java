package br.com.ecoturismo.perfil.dto;

import java.time.LocalDateTime;

/**
 * Cabeçalho do perfil público. Os campos souEu/euSigo/meSegue/euBloqueei são do ponto de vista de quem está vendo,
 * para a tela decidir entre "Editar perfil", "Seguir"/"Seguir de volta"/"Amigos" e "Desbloquear".
 */
public record PerfilResponse(
        Long id,
        String nome,
        String fotoUrl,
        String bio,
        LocalDateTime membroDesde,
        long avaliacoes,
        long visitas,
        long partiesOrganizadas,
        long seguidores,
        long seguindo,
        long amigos,
        long fotos,
        boolean souEu,
        boolean euSigo,
        boolean meSegue,
        boolean euBloqueei
) {}
