package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Alocacao;
import br.com.cs.sislab.model.Computador;
import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.AlocacaoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AlocacaoService {
    private final AlocacaoRepository alocacaoRepository;
    private final UsuarioService usuarioService;
    private final ReservaService reservaService;
    private final ComputadorService computadorService;

    public AlocacaoService(AlocacaoRepository alocacaoRepository, UsuarioService usuarioService,
                           ReservaService reservaService, ComputadorService computadorService) {
        this.alocacaoRepository = alocacaoRepository;
        this.usuarioService = usuarioService;
        this.reservaService = reservaService;
        this.computadorService = computadorService;
    }

    public Alocacao alocar(Long idUsuario, Long reservaId, Long alunoId, Long maquinaId) {
        Reserva reserva = reservaService.buscarPorId(idUsuario, reservaId);
        exigirGestor(idUsuario, reserva);

        Usuario aluno = validarAlunoDaTurma(reserva, alunoId);
        Computador maquina = validarMaquinaAtivaDoLaboratorio(reserva, maquinaId);

        if (alocacaoRepository.existsByReservaIdAndMaquinaId(reservaId, maquinaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A máquina já está ocupada nesta reserva");
        }
        if (alocacaoRepository.existsByReservaIdAndAlunoId(reservaId, alunoId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O aluno já possui um posto nesta reserva");
        }
        if (alocacaoRepository.countByReservaId(reservaId) >= maquinasAtivas(reserva)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não há máquinas ativas suficientes para alocar mais alunos");
        }

        return alocacaoRepository.save(new Alocacao(reserva, aluno, maquina));
    }

    // Realoca um aluno já alocado para outra máquina (ex.: o computador atual quebrou).
    public Alocacao mover(Long idUsuario, Long reservaId, Long alunoId, Long novaMaquinaId) {
        Reserva reserva = reservaService.buscarPorId(idUsuario, reservaId);
        exigirGestor(idUsuario, reserva);

        Alocacao alocacao = alocacaoRepository.findByReservaIdAndAlunoId(reservaId, alunoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "O aluno não está alocado nesta reserva"));

        Computador destino = validarMaquinaAtivaDoLaboratorio(reserva, novaMaquinaId);
        if (destino.getId().equals(alocacao.getMaquina().getId())) {
            return alocacao; // já está nesta máquina
        }
        if (alocacaoRepository.existsByReservaIdAndMaquinaId(reservaId, novaMaquinaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A máquina de destino já está ocupada nesta reserva");
        }

        alocacao.setMaquina(destino);
        return alocacaoRepository.save(alocacao);
    }

    // Remove a alocação de um aluno (libera a estação).
    public void desalocar(Long idUsuario, Long reservaId, Long alunoId) {
        Reserva reserva = reservaService.buscarPorId(idUsuario, reservaId);
        exigirGestor(idUsuario, reserva);

        Alocacao alocacao = alocacaoRepository.findByReservaIdAndAlunoId(reservaId, alunoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "O aluno não está alocado nesta reserva"));
        alocacaoRepository.delete(alocacao);
    }

    public List<Alocacao> listarPorReserva(Long idUsuario, Long reservaId) {
        // Reaproveita a regra de acesso da reserva: ADM ou docente dono podem consultar.
        reservaService.buscarPorId(idUsuario, reservaId);
        return alocacaoRepository.findByReservaId(reservaId);
    }

    // Pode alocar/realocar: o ADMINISTRADOR ou o docente dono da reserva.
    private void exigirGestor(Long idUsuario, Reserva reserva) {
        boolean admin = usuarioService.buscarPorId(idUsuario).getPerfil() == Usuario.Perfil.ADMINISTRADOR;
        boolean dono = idUsuario.equals(reserva.getDocente().getId());
        if (!admin && !dono) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas o docente dono da reserva ou um administrador podem alocar alunos");
        }
    }

    private Usuario validarAlunoDaTurma(Reserva reserva, Long alunoId) {
        Usuario aluno = usuarioService.buscarPorId(alunoId);
        if (!reserva.getTurma().possuiAluno(aluno)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O aluno não pertence à turma desta reserva");
        }
        return aluno;
    }

    private Computador validarMaquinaAtivaDoLaboratorio(Reserva reserva, Long maquinaId) {
        Computador maquina = computadorService.buscarPorId(maquinaId);
        if (maquina.getLaboratorio() == null
                || !maquina.getLaboratorio().getId().equals(reserva.getLaboratorio().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A máquina não pertence ao laboratório desta reserva");
        }
        if (maquina.getStatus() != Computador.StatusComputador.ATIVO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A máquina não está ativa");
        }
        return maquina;
    }

    private long maquinasAtivas(Reserva reserva) {
        return alocacaoRepository.contarMaquinasPorStatus(
                reserva.getLaboratorio().getId(), Computador.StatusComputador.ATIVO);
    }
}
