package br.com.ecoturismo.security.dto;

import br.com.ecoturismo.usuario.dto.UsuarioResponse;

public record AuthResponse(String token, UsuarioResponse usuario) {}
