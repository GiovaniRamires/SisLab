package br.com.cs.sislab.service;

import br.com.cs.sislab.model.*;
import br.com.cs.sislab.repository.AlocacaoRepository;
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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AlocacaoServiceTest {
    @Mock
    private AlocacaoRepository alocacaoRepository;
    @Mock
    private UsuarioService usuarioService;
    @Mock
    private ReservaService reservaService;
    @Mock
    private ComputadorService computadorService;
    @InjectMocks
    private AlocacaoService alocacaoService;

    private Usuario docente;
    private Usuario aluno;
    private Turma turma;
    private Laboratorio lab;
    private Reserva reserva;
    private Computador maquina;

    @BeforeEach
    void setUp() {
        docente = new Usuario("Ana", "ana@email.com", "1", Usuario.Perfil.DOCENTE);
        docente.setId(1L);

        aluno = new Usuario("Bia", "bia@email.com", "2", Usuario.Perfil.DISCENTE);
        aluno.setId(2L);

        turma = new Turma("ES-A", "Engenharia de Software", docente);
        turma.setId(10L);
        turma.matricular(aluno);

        lab = new Laboratorio("Lab 1", "Bloco A");
        lab.setId(20L);

        reserva = new Reserva(lab, turma, LocalDate.now().plusDays(1),
                LocalTime.of(8, 0), LocalTime.of(10, 0), "Aula");
        reserva.setId(5L);

        maquina = new Computador("PC-01", Computador.StatusComputador.ATIVO, lab);
        maquina.setId(30L);
    }

    @Test
    public void deveAlocarAlunoNaMaquina() {
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 30L)).thenReturn(false);
        when(alocacaoRepository.existsByReservaIdAndAlunoId(5L, 2L)).thenReturn(false);
        when(alocacaoRepository.contarMaquinasPorStatus(20L, Computador.StatusComputador.ATIVO)).thenReturn(2L);
        when(alocacaoRepository.countByReservaId(5L)).thenReturn(0L);
        when(alocacaoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Alocacao a = alocacaoService.alocar(1L, 5L, 2L, 30L);

        assertEquals(aluno, a.getAluno());
        assertEquals(maquina, a.getMaquina());
        assertEquals(reserva, a.getReserva());
        verify(alocacaoRepository).save(any());
    }

    @Test
    public void outroDocenteNaoPodeAlocar() {
        // Um docente que não é dono da reserva (e não é admin) não pode alocar.
        Usuario outroDocente = new Usuario("Caio", "caio@email.com", "9", Usuario.Perfil.DOCENTE);
        outroDocente.setId(9L);
        when(reservaService.buscarPorId(9L, 5L)).thenReturn(reserva); // passou no acesso (consulta), mas não é dono
        when(usuarioService.buscarPorId(9L)).thenReturn(outroDocente);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(9L, 5L, 2L, 30L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void administradorPodeAlocar() {
        // Nova regra: o ADMINISTRADOR também pode alocar alunos.
        Usuario adm = new Usuario("Adm", "adm@email.com", "9", Usuario.Perfil.ADMINISTRADOR);
        adm.setId(9L);
        when(reservaService.buscarPorId(9L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(9L)).thenReturn(adm);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 30L)).thenReturn(false);
        when(alocacaoRepository.existsByReservaIdAndAlunoId(5L, 2L)).thenReturn(false);
        when(alocacaoRepository.contarMaquinasPorStatus(20L, Computador.StatusComputador.ATIVO)).thenReturn(2L);
        when(alocacaoRepository.countByReservaId(5L)).thenReturn(0L);
        when(alocacaoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Alocacao a = alocacaoService.alocar(9L, 5L, 2L, 30L);

        assertEquals(aluno, a.getAluno());
        verify(alocacaoRepository).save(any());
    }

    @Test
    public void alunoForaDaTurmaDeveRetornar400() {
        Usuario forasteiro = new Usuario("Caio", "caio@email.com", "3", Usuario.Perfil.DISCENTE);
        forasteiro.setId(3L);
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(3L)).thenReturn(forasteiro);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 3L, 30L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void maquinaDeOutroLaboratorioDeveRetornar400() {
        Laboratorio outroLab = new Laboratorio("Lab 2", "Bloco B");
        outroLab.setId(21L);
        Computador outraMaquina = new Computador("PC-99", Computador.StatusComputador.ATIVO, outroLab);
        outraMaquina.setId(31L);

        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(31L)).thenReturn(outraMaquina);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 2L, 31L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void maquinaEmManutencaoDeveRetornar409() {
        maquina.setStatus(Computador.StatusComputador.EM_MANUTENCAO);
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 2L, 30L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void maquinaJaOcupadaDeveRetornar409() {
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 30L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 2L, 30L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void alunoComPostoDuplicadoDeveRetornar409() {
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 30L)).thenReturn(false);
        when(alocacaoRepository.existsByReservaIdAndAlunoId(5L, 2L)).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 2L, 30L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void excederMaquinasAtivasDeveRetornar409() {
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(usuarioService.buscarPorId(2L)).thenReturn(aluno);
        when(computadorService.buscarPorId(30L)).thenReturn(maquina);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 30L)).thenReturn(false);
        when(alocacaoRepository.existsByReservaIdAndAlunoId(5L, 2L)).thenReturn(false);
        when(alocacaoRepository.contarMaquinasPorStatus(20L, Computador.StatusComputador.ATIVO)).thenReturn(2L);
        when(alocacaoRepository.countByReservaId(5L)).thenReturn(2L); // já no limite

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.alocar(1L, 5L, 2L, 30L));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(alocacaoRepository, never()).save(any());
    }

    @Test
    public void moverDeveRealocarAlunoParaOutraMaquina() {
        Computador destino = new Computador("PC-02", Computador.StatusComputador.ATIVO, lab);
        destino.setId(31L);
        Alocacao atual = new Alocacao(reserva, aluno, maquina);
        atual.setId(100L);

        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(alocacaoRepository.findByReservaIdAndAlunoId(5L, 2L)).thenReturn(java.util.Optional.of(atual));
        when(computadorService.buscarPorId(31L)).thenReturn(destino);
        when(alocacaoRepository.existsByReservaIdAndMaquinaId(5L, 31L)).thenReturn(false);
        when(alocacaoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Alocacao movida = alocacaoService.mover(1L, 5L, 2L, 31L);

        assertEquals(destino, movida.getMaquina());
        verify(alocacaoRepository).save(atual);
    }

    @Test
    public void moverAlunoNaoAlocadoDeveRetornar404() {
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(alocacaoRepository.findByReservaIdAndAlunoId(5L, 2L)).thenReturn(java.util.Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> alocacaoService.mover(1L, 5L, 2L, 31L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    public void desalocarDeveRemoverAlocacao() {
        Alocacao atual = new Alocacao(reserva, aluno, maquina);
        atual.setId(100L);
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(usuarioService.buscarPorId(1L)).thenReturn(docente);
        when(alocacaoRepository.findByReservaIdAndAlunoId(5L, 2L)).thenReturn(java.util.Optional.of(atual));

        alocacaoService.desalocar(1L, 5L, 2L);

        verify(alocacaoRepository).delete(atual);
    }

    @Test
    public void listarPorReservaDeveRetornarAlocacoes() {
        Alocacao a = new Alocacao(reserva, aluno, maquina);
        a.setId(100L);
        when(reservaService.buscarPorId(1L, 5L)).thenReturn(reserva);
        when(alocacaoRepository.findByReservaId(5L)).thenReturn(List.of(a));

        List<Alocacao> resultado = alocacaoService.listarPorReserva(1L, 5L);

        assertEquals(1, resultado.size());
        assertEquals(100L, resultado.get(0).getId());
    }
}
