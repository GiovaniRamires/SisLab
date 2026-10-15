package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Turma;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.TurmaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TurmaServiceTest {
    @Mock
    private TurmaRepository turmaRepository;
    @Mock
    private UsuarioService usuarioService;
    @InjectMocks
    private TurmaService turmaService;

    private Usuario adm;
    private Usuario docente;
    private Usuario outroDocente;
    private Usuario aluno;
    private Turma turma;

    private Usuario usuario(Long id, String nome, Usuario.Perfil perfil) {
        Usuario u = new Usuario(nome, nome.toLowerCase() + "@email.com", "rgm" + id, perfil);
        u.setId(id);
        return u;
    }

    @BeforeEach
    void setUp() {
        adm = usuario(9L, "Adm", Usuario.Perfil.ADMINISTRADOR);
        docente = usuario(1L, "Ana", Usuario.Perfil.DOCENTE);
        outroDocente = usuario(3L, "Caio", Usuario.Perfil.DOCENTE);
        aluno = usuario(5L, "Bia", Usuario.Perfil.DISCENTE);
        turma = new Turma("ES-A", "Engenharia de Software", docente);
        turma.setId(10L);
    }

    @Test
    public void admDeveCriarTurmaParaUmDocente() {
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Turma criada = turmaService.criar(9L, "ES-A", "Engenharia de Software", 1L);

        assertEquals("ES-A", criada.getNome());
        assertEquals("Engenharia de Software", criada.getDisciplina());
        assertEquals(docente, criada.getDocente());
        assertTrue(criada.getAlunos().isEmpty());
    }

    @Test
    public void naoAdmNaoPodeCriarTurma() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.criar(1L, "ES-A", "Engenharia de Software", 1L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(turmaRepository, never()).save(any());
    }

    @Test
    public void responsavelPelaTurmaDeveSerDocente() {
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);
        when(usuarioService.buscarPorId(5L)).thenReturn(aluno);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.criar(9L, "ES-A", "Engenharia de Software", 5L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(turmaRepository, never()).save(any());
    }

    @Test
    public void deveRetornar404ParaTurmaInexistente() {
        when(turmaRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.buscarPorId(99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    public void docenteDonoPodeConsultar() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);

        assertEquals(10L, turmaService.consultar(1L, 10L).getId());
    }

    @Test
    public void admPodeConsultarQualquerTurma() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);

        assertEquals(10L, turmaService.consultar(9L, 10L).getId());
    }

    @Test
    public void outroDocenteNaoPodeConsultar() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(3L)).thenReturn(outroDocente);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.consultar(3L, 10L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    public void admListaTodasAsTurmas() {
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);
        when(turmaRepository.findAll()).thenReturn(List.of(turma));

        assertEquals(1, turmaService.listar(9L).size());
        verify(turmaRepository, never()).findByDocenteId(any());
    }

    @Test
    public void docenteListaApenasAsSuasTurmas() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaRepository.findByDocenteId(1L)).thenReturn(List.of(turma));

        List<Turma> resultado = turmaService.listar(1L);

        assertEquals(1, resultado.size());
        assertEquals(docente, resultado.get(0).getDocente());
        verify(turmaRepository, never()).findAll();
    }

    @Test
    public void discenteNaoPodeListarTurmas() {
        when(usuarioService.buscarPorId(5L)).thenReturn(aluno);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.listar(5L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }


    @Test
    public void docenteDonoDeveMatricularDiscente() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(5L)).thenReturn(aluno);
        when(turmaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Turma resultado = turmaService.matricular(1L, 10L, 5L);

        assertTrue(resultado.possuiAluno(aluno));
        assertEquals(1, resultado.getAlunos().size());
    }

    @Test
    public void admTambemPodeMatricular() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);
        when(usuarioService.buscarPorId(5L)).thenReturn(aluno);
        when(turmaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(turmaService.matricular(9L, 10L, 5L).possuiAluno(aluno));
    }

    @Test
    public void docenteQueNaoEDonoNaoPodeMatricular() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(3L)).thenReturn(outroDocente);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.matricular(3L, 10L, 5L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(usuarioService, never()).buscarPorId(5L);
        verify(turmaRepository, never()).save(any());
    }

    @Test
    public void soDiscentePodeSerMatriculado() {
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(3L)).thenReturn(outroDocente); // perfil DOCENTE

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.matricular(1L, 10L, 3L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(turma.getAlunos().isEmpty());
        verify(turmaRepository, never()).save(any());
    }

    @Test
    public void matriculaDuplicadaDeveRetornar409() {
        turma.matricular(aluno);
        when(turmaRepository.findById(10L)).thenReturn(Optional.of(turma));
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(5L)).thenReturn(aluno);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.matricular(1L, 10L, 5L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(1, turma.getAlunos().size());
        verify(turmaRepository, never()).save(any());
    }

    @Test
    public void matricularEmTurmaInexistenteDeveRetornar404() {
        when(turmaRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> turmaService.matricular(1L, 99L, 5L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(usuarioService);
    }
}