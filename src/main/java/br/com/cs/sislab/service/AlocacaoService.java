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
        // buscarPorId já garante que o usuário é ADM ou o docente dono (senão 403/404).
        Reserva reserva = reservaService.buscarPorId(idUsuario, reservaId);

        // (1) Só o docente dono da reserva pode alocar. ADM é barrado aqui.
        if (!idUsuario.equals(reserva.getDocente().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas o docente dono da reserva pode alocar alunos");
        }

        // (2) Aluno pertence à turma da reserva.
        Usuario aluno = usuarioService.buscarPorId(alunoId);
        if (!reserva.getTurma().possuiAluno(aluno)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O aluno não pertence à turma desta reserva");
        }

        // (3) Máquina pertence ao laboratório da reserva.
        Computador maquina = computadorService.buscarPorId(maquinaId);
        if (maquina.getLaboratorio() == null
                || !maquina.getLaboratorio().getId().equals(reserva.getLaboratorio().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A máquina não pertence ao laboratório desta reserva");
        }

        // (4) Máquina está ATIVA (RN03).
        if (maquina.getStatus() != Computador.StatusComputador.ATIVO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A máquina não está ativa");
        }

        // (5) Máquina ainda livre nesta reserva.
        if (alocacaoRepository.existsByReservaIdAndMaquinaId(reservaId, maquinaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A máquina já está ocupada nesta reserva");
        }

        // (6) Aluno ainda sem posto nesta reserva.
        if (alocacaoRepository.existsByReservaIdAndAlunoId(reservaId, alunoId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O aluno já possui um posto nesta reserva");
        }

        // (7) Total alocado menor que o número de máquinas ativas (RN02).
        long maquinasAtivas = alocacaoRepository.contarMaquinasPorStatus(
                reserva.getLaboratorio().getId(), Computador.StatusComputador.ATIVO);
        if (alocacaoRepository.countByReservaId(reservaId) >= maquinasAtivas) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Não há máquinas ativas suficientes para alocar mais alunos");
        }

        return alocacaoRepository.save(new Alocacao(reserva, aluno, maquina));
    }

    public List<Alocacao> listarPorReserva(Long idUsuario, Long reservaId) {
        // Reaproveita a regra de acesso da reserva: ADM ou docente dono podem consultar.
        reservaService.buscarPorId(idUsuario, reservaId);
        return alocacaoRepository.findByReservaId(reservaId);
    }
}
