package br.com.cs.sislab.service;

import br.com.cs.sislab.dto.LoginRespostaDTO;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.UsuarioRepository;
import br.com.cs.sislab.security.TokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TokenService tokenService;
    @InjectMocks
    private AuthService authService;

    private Usuario usuarioComSenha() {
        Usuario u = new Usuario("Ana", "ana@email.com", "1", Usuario.Perfil.DOCENTE);
        u.setSenhaHash("hash");
        return u;
    }

    @Test
    public void deveGerarTokenEDevolverDadosDoUsuarioComCredenciaisValidas() {
        Usuario u = usuarioComSenha();
        u.setId(7L);
        when(usuarioRepository.findByEmail("ana@email.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("senha1234", "hash")).thenReturn(true);
        when(tokenService.gerar(u)).thenReturn("jwt");

        LoginRespostaDTO resposta = authService.login("ana@email.com", "senha1234");

        assertEquals("jwt", resposta.token());
        assertEquals(7L, resposta.id());
        assertEquals("Ana", resposta.nome());
        assertEquals(Usuario.Perfil.DOCENTE, resposta.perfil());
    }

    @Test
    public void deveRecusarSenhaIncorreta() {
        when(usuarioRepository.findByEmail("ana@email.com")).thenReturn(Optional.of(usuarioComSenha()));
        when(passwordEncoder.matches("errada", "hash")).thenReturn(false);

        var ex = assertThrows(ResponseStatusException.class, () -> authService.login("ana@email.com", "errada"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(tokenService);
    }

    @Test
    public void deveRecusarEmailInexistente() {
        when(usuarioRepository.findByEmail("x@email.com")).thenReturn(Optional.empty());

        var ex = assertThrows(ResponseStatusException.class, () -> authService.login("x@email.com", "qualquer"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(tokenService);
    }

    @Test
    public void deveRecusarUsuarioSemSenhaCadastrada() {
        Usuario semSenha = new Usuario("Bia", "bia@email.com", "2", Usuario.Perfil.DISCENTE);
        when(usuarioRepository.findByEmail("bia@email.com")).thenReturn(Optional.of(semSenha));

        var ex = assertThrows(ResponseStatusException.class, () -> authService.login("bia@email.com", "qualquer"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(passwordEncoder, tokenService);
    }
}
