package br.com.cs.sislab.service;

import br.com.cs.sislab.model.*;
import br.com.cs.sislab.repository.ReservaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReservaServiceTest {
    @Mock
    private ReservaRepository reservaRepository;
    @Mock
    private UsuarioService usuarioService;
    @Mock
    private LaboratorioService laboratorioService;
    @Mock
    private TurmaService turmaService;
    @InjectMocks
    private ReservaService reservaService;

    private final LocalDate amanha = LocalDate.now().plusDays(1);
    private final LocalTime oito = LocalTime.of(8, 0);
    private final LocalTime dez = LocalTime.of(10, 0);

    private Usuario docente;
    private Turma turma;
    private Laboratorio lab;

    @BeforeEach
    void setUp() {
        docente = new Usuario("Ana", "ana@email.com", "1", Usuario.Perfil.DOCENTE);
        docente.setId(1L);
        turma = new Turma("ES-A", "Engenharia de Software", docente);
        turma.setId(10L);
        lab = new Laboratorio("Lab 1", "Bloco A");
        lab.setId(20L);
    }

    @Test
    public void deveCriarReservaConfirmada() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaService.buscarPorId(10L)).thenReturn(turma);
        when(laboratorioService.buscarPorId(20L)).thenReturn(lab);
        when(reservaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Reserva r = reservaService.criar(1L, 20L, 10L, amanha, oito, dez, "Prova prática");

        assertEquals(StatusReserva.CONFIRMADA, r.getStatus());
        assertEquals(lab, r.getLaboratorio());
        assertEquals(turma, r.getTurma());
        assertEquals(docente, r.getDocente());
    }

    @Test
    public void deveBloquearQuemNaoEDocente() {
        Usuario aluno = new Usuario("Bia", "bia@email.com", "2", Usuario.Perfil.DISCENTE);
        aluno.setId(2L);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(2L, 20L, 10L, amanha, oito, dez, null));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    public void deveBloquearDocenteQueNaoEDonoDaTurma() {
        Usuario outro = new Usuario("Caio", "caio@email.com", "3", Usuario.Perfil.DOCENTE);
        outro.setId(3L);
        when(usuarioService.buscarPorId(3L)).thenReturn(outro);
        when(turmaService.buscarPorId(10L)).thenReturn(turma);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(3L, 20L, 10L, amanha, oito, dez, null));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    public void deveRejeitarFimIgualOuAnteriorAoInicio() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaService.buscarPorId(10L)).thenReturn(turma);

        var igual = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(1L, 20L, 10L, amanha, dez, dez, null));
        var antes = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(1L, 20L, 10L, amanha, dez, oito, null));

        assertEquals(HttpStatus.BAD_REQUEST, igual.getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, antes.getStatusCode());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    public void deveRejeitarDataPassada() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaService.buscarPorId(10L)).thenReturn(turma);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(1L, 20L, 10L, LocalDate.now().minusDays(1), oito, dez, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    public void deveRetornar409QuandoHaConflitoDeHorario() {
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(turmaService.buscarPorId(10L)).thenReturn(turma);
        when(laboratorioService.buscarPorId(20L)).thenReturn(lab);
        when(reservaRepository.existeConflito(20L, amanha, oito, dez, StatusReserva.CONFIRMADA)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> reservaService.criar(1L, 20L, 10L, amanha, oito, dez, null));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(reservaRepository, never()).save(any());
    }

    private Reserva reservaSalva() {
        Reserva r = new Reserva(lab, turma, amanha, oito, dez, null);
        r.setId(5L);
        return r;
    }

    @Test
    public void docenteDonoPodeConsultar() {
        when(reservaRepository.findById(5L)).thenReturn(Optional.of(reservaSalva()));
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);

        assertEquals(5L, reservaService.buscarPorId(1L, 5L).getId());
    }

    @Test
    public void administradorPodeConsultar() {
        Usuario adm = new Usuario("Adm", "adm@email.com", "9", Usuario.Perfil.ADMINISTRADOR);
        adm.setId(9L);
        when(reservaRepository.findById(5L)).thenReturn(Optional.of(reservaSalva()));
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);

        assertEquals(5L, reservaService.buscarPorId(9L, 5L).getId());
    }

    @Test
    public void outroUsuarioNaoPodeConsultar() {
        Usuario outro = new Usuario("Caio", "caio@email.com", "3", Usuario.Perfil.DOCENTE);
        outro.setId(3L);
        when(reservaRepository.findById(5L)).thenReturn(Optional.of(reservaSalva()));
        when(usuarioService.buscarPorId(3L)).thenReturn(outro);

        var ex = assertThrows(ResponseStatusException.class, () -> reservaService.buscarPorId(3L, 5L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    public void exDocenteRebaixadoParaDiscenteNaoPodeConsultar() {
        Usuario exDocente = new Usuario("Ana", "ana@email.com", "1", Usuario.Perfil.DISCENTE);
        exDocente.setId(1L);
        when(reservaRepository.findById(5L)).thenReturn(Optional.of(reservaSalva()));
        when(usuarioService.buscarPorId(1L)).thenReturn(exDocente);

        var ex = assertThrows(ResponseStatusException.class, () -> reservaService.buscarPorId(1L, 5L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    public void deveRetornar404ParaReservaInexistente() {
        when(reservaRepository.findById(99L)).thenReturn(Optional.empty());

        var ex = assertThrows(ResponseStatusException.class, () -> reservaService.buscarPorId(1L, 99L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(usuarioService);
    }
}