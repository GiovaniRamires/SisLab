package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Laboratorio;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.LaboratorioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LaboratorioTest {
    @Mock
    private LaboratorioRepository laboratorioRepository;
    @Mock
    private UsuarioService usuarioService;
    @InjectMocks
    private LaboratorioService laboratorioService;


    @Test
    public void deveCriarUmLaboratorioSeForAdm(){

        Usuario admin = new Usuario();
        admin.setPerfil(Usuario.Perfil.ADMINISTRADOR);
        when(usuarioService.buscarPorId(1L)).thenReturn(admin);

        Laboratorio laboratorio = new Laboratorio("Teste", "bloco teste");
        when(laboratorioRepository.save(any())).thenReturn(laboratorio);

        Laboratorio resultado = laboratorioService.criar(1L, "Teste", "bloco teste" );

        assertEquals(laboratorio, resultado);
        verify(laboratorioRepository).save(any());
    }

    @Test
    public void deveFalharAoCriarLaboratorioComoDocente(){
        Usuario docente = new Usuario();
        docente.setPerfil(Usuario.Perfil.DOCENTE);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);

        assertThrows(ResponseStatusException.class, () -> laboratorioService.criar(1L, "Teste", "bloco teste" ));
        verify(laboratorioRepository, never()).save(any());
    }
    @Test
    public void deveFalharAoCriarLaboratorioComoDiscente(){
        Usuario discente = new Usuario();
        discente.setPerfil(Usuario.Perfil.DISCENTE);
        when(usuarioService.buscarPorId(1L)).thenReturn(discente);

        assertThrows(ResponseStatusException.class, () -> laboratorioService.criar(1L, "Teste", "bloco teste" ));
        verify(laboratorioRepository, never()).save(any());
    }

    @Test
    public void deveRetornarLista(){
        List<Laboratorio> listaDeLabs = List.of(new Laboratorio("Teste", "bloco teste"));
        when(laboratorioRepository.findAll()).thenReturn(listaDeLabs);
        var laboratorios = laboratorioService.listar();

        assertEquals(listaDeLabs, laboratorios);
        verify(laboratorioRepository).findAll();
    }


    @Test
    public void buscarPorIdExistente(){
        Laboratorio laboratorio = new Laboratorio("Teste", "bloco teste");
        when(laboratorioRepository.findById(1L)).thenReturn(Optional.of(laboratorio));

        Laboratorio resultado = laboratorioService.buscarPorId(1L);

        assertEquals(laboratorio, resultado);
        verify(laboratorioRepository).findById(1L);
    }

    @Test
    public void buscarPorIdInexistente(){
        when(laboratorioRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> laboratorioService.buscarPorId(99L));
        }
    @Test
    public void deveAtualizarLaboratorio(){
        Usuario admin = new Usuario();
        admin.setPerfil(Usuario.Perfil.ADMINISTRADOR);
        when(usuarioService.buscarPorId(1L)).thenReturn(admin);
        Laboratorio laboratorio = new Laboratorio("Teste", "bloco teste");
        when(laboratorioRepository.findById(1L)).thenReturn(Optional.of(laboratorio));

        laboratorioService.atualizar(1L, 1L, "TesteFeito", "bloco testeFeito");

        assertEquals("TesteFeito", laboratorio.getNome());
        assertEquals("bloco testeFeito", laboratorio.getBloco());
        verify(laboratorioRepository).save(laboratorio);
    }
    @Test
    public void naoDeveAtualizarSeNaoForAdmin (){
        Usuario docente = new Usuario();
        docente.setPerfil(Usuario.Perfil.DOCENTE);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);

        assertThrows(ResponseStatusException.class, () -> laboratorioService.atualizar(1L, 1L, "TesteFeito", "bloco testeFeito"));
        verify(laboratorioRepository, never()).save(any());
    }

    @Test
    public void naoDeveAtualizarSeLaboratorioNaoExiste(){
        Usuario admin = new Usuario();
        admin.setPerfil(Usuario.Perfil.ADMINISTRADOR);
        when(usuarioService.buscarPorId(1L)).thenReturn(admin);
        when(laboratorioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> laboratorioService.atualizar(1L, 99L, "TesteFeito", "Bloco testeFeito"));
    }

    @Test
    public void deveDeletarLaboratorio(){
        Usuario admin = new Usuario();
        admin.setPerfil(Usuario.Perfil.ADMINISTRADOR);
        when(usuarioService.buscarPorId(1L)).thenReturn(admin);

        Laboratorio laboratorio = new Laboratorio("Teste", "bloco teste");
        when(laboratorioRepository.findById(1L)).thenReturn(Optional.of(laboratorio));

        laboratorioService.delete(1L, 1L);

        verify(laboratorioRepository).delete(laboratorio);

    }
}
