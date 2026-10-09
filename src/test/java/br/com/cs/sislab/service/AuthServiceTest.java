package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {
    @Mock
    private UsuarioRepository usuarioRepository;
    @InjectMocks
    private AuthService authService;

    @Test
    public void deveRetornarUsuarioComCredenciaisValidas() {
        Usuario docente = new Usuario("Ana", "ana@email.com", "123456", Usuario.Perfil.DOCENTE);
        when(usuarioRepository.findFirstByEmailIgnoreCaseAndRgm("ana@email.com", "123456"))
                .thenReturn(Optional.of(docente));

        Usuario resultado = authService.login("ana@email.com", "123456");

        assertEquals("Ana", resultado.getNome());
        assertEquals(Usuario.Perfil.DOCENTE, resultado.getPerfil());
    }

    @Test
    public void deveIgnorarEspacosNosCampos() {
        Usuario aluno = new Usuario("Bia", "bia@email.com", "654321", Usuario.Perfil.DISCENTE);
        when(usuarioRepository.findFirstByEmailIgnoreCaseAndRgm("bia@email.com", "654321"))
                .thenReturn(Optional.of(aluno));

        Usuario resultado = authService.login("  bia@email.com ", " 654321 ");

        assertEquals(Usuario.Perfil.DISCENTE, resultado.getPerfil());
    }

    @Test
    public void deveRetornar401ComCredenciaisInvalidas() {
        when(usuarioRepository.findFirstByEmailIgnoreCaseAndRgm(any(), any()))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login("x@email.com", "000000"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    public void deveRetornar401SeCamposNulos() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(usuarioRepository);
    }
}
