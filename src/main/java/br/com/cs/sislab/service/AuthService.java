package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final String CREDENCIAIS_INVALIDAS = "E-mail ou RGM inválidos";
    private final UsuarioRepository usuarioRepository;

    AuthService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario login(String email, String rgm) {
        if (email == null || rgm == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, CREDENCIAIS_INVALIDAS);
        }
        return usuarioRepository.findFirstByEmailIgnoreCaseAndRgm(email.trim(), rgm.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, CREDENCIAIS_INVALIDAS));
    }
}
