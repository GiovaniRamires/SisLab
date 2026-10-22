package br.com.cs.sislab.service;

import br.com.cs.sislab.dto.LoginRespostaDTO;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.UsuarioRepository;
import br.com.cs.sislab.security.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    public LoginRespostaDTO login(String email, String senha) {
        // Mesma mensagem para e-mail inexistente e senha errada, para não revelar quais e-mails existem.
        Usuario usuario = usuarioRepository.findByEmail(email)
                .filter(u -> u.getSenhaHash() != null && passwordEncoder.matches(senha, u.getSenhaHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos"));
        String token = tokenService.gerar(usuario);
        return new LoginRespostaDTO(token, usuario.getId(), usuario.getNome(), usuario.getEmail(),
                usuario.getRgm(), usuario.getPerfil());
    }
}
