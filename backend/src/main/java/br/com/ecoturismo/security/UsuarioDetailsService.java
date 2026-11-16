package br.com.ecoturismo.security;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import br.com.ecoturismo.usuario.Role;
import br.com.ecoturismo.usuario.Usuario;
import br.com.ecoturismo.usuario.UsuarioRepository;

@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioRepository repository;

    public UsuarioDetailsService(UsuarioRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario u = repository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
        return new UsuarioAutenticado(u);
    }

    static List<GrantedAuthority> permissoes(Role role) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    /** Guarda o usuário já carregado, para o login não precisar buscá-lo de novo depois de conferir a senha. */
    public static class UsuarioAutenticado extends User {

        private final transient Usuario usuario;

        UsuarioAutenticado(Usuario u) {
            super(u.getEmail(), u.getSenhaHash(), permissoes(u.getRole()));
            this.usuario = u;
        }

        public Usuario getUsuario() {
            return usuario;
        }
    }
}
