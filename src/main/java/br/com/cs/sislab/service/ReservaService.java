package br.com.cs.sislab.service;

import br.com.cs.sislab.model.*;
import br.com.cs.sislab.repository.ReservaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;

@Service
public class ReservaService {
    private final ReservaRepository reservaRepository;
    private final UsuarioService usuarioService;
    private final LaboratorioService laboratorioService;
    private final TurmaService turmaService;

    public ReservaService(ReservaRepository reservaRepository, UsuarioService usuarioService,
                          LaboratorioService laboratorioService, TurmaService turmaService) {
        this.reservaRepository = reservaRepository;
        this.usuarioService = usuarioService;
        this.laboratorioService = laboratorioService;
        this.turmaService = turmaService;
    }

    public Reserva criar(Long idUsuario, Long laboratorioId, Long turmaId, LocalDate data,
                         LocalTime horaInicio, LocalTime horaFim, String justificativa) {

        Usuario usuario = usuarioService.buscarPorId(idUsuario);
        if (usuario.getPerfil() != Usuario.Perfil.DOCENTE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas docentes podem reservar laboratórios");
        }

        Turma turma = turmaService.buscarPorId(turmaId);
        if (!idUsuario.equals(turma.getDocente().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A turma não pertence a este docente");
        }

        if (!horaFim.isAfter(horaInicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O horário de fim deve ser posterior ao de início");
        }
        if (data.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível reservar em data passada");
        }

        Laboratorio laboratorio = laboratorioService.buscarPorId(laboratorioId);
        validarConflitos(laboratorioId, turmaId, idUsuario, data, horaInicio, horaFim, -1L);

        return reservaRepository.save(new Reserva(laboratorio, turma, data, horaInicio, horaFim, justificativa));
    }

    // Edita uma reserva existente (ADMINISTRADOR ou docente dono). Mantém as mesmas regras de conflito,
    // ignorando a própria reserva na checagem.
    public Reserva atualizar(Long idUsuario, Long reservaId, Long laboratorioId, Long turmaId,
                             LocalDate data, LocalTime horaInicio, LocalTime horaFim, String justificativa) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        exigirAdminOuDono(usuarioService.buscarPorId(idUsuario), reserva);

        if (reserva.getStatus() == StatusReserva.CANCELADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Não é possível editar uma reserva cancelada");
        }
        if (!horaFim.isAfter(horaInicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O horário de fim deve ser posterior ao de início");
        }
        if (data.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível reservar em data passada");
        }

        Laboratorio laboratorio = laboratorioService.buscarPorId(laboratorioId);
        Turma turma = turmaService.buscarPorId(turmaId);
        if (!reserva.getDocente().getId().equals(turma.getDocente().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A turma deve pertencer ao mesmo docente da reserva");
        }
        validarConflitos(laboratorioId, turmaId, reserva.getDocente().getId(), data, horaInicio, horaFim, reservaId);

        reserva.setLaboratorio(laboratorio);
        reserva.setTurma(turma);
        reserva.setData(data);
        reserva.setHoraInicio(horaInicio);
        reserva.setHoraFim(horaFim);
        reserva.setJustificativa(justificativa);
        return reservaRepository.save(reserva);
    }

    private void validarConflitos(Long laboratorioId, Long turmaId, Long docenteId, LocalDate data,
                                  LocalTime horaInicio, LocalTime horaFim, Long ignorarId) {
        if (reservaRepository.existeConflito(laboratorioId, data, horaInicio, horaFim, StatusReserva.CONFIRMADA, ignorarId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O laboratório já está reservado nesse horário");
        }
        if (reservaRepository.turmaEmConflito(turmaId, data, horaInicio, horaFim, StatusReserva.CONFIRMADA, ignorarId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A turma já possui uma reserva nesse horário");
        }
        if (reservaRepository.docenteEmConflito(docenteId, data, horaInicio, horaFim, StatusReserva.CONFIRMADA, ignorarId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já possui uma reserva nesse horário");
        }
    }

    // Lista as reservas conforme o perfil: ADMINISTRADOR vê todas; DOCENTE vê as suas.
    public java.util.List<Reserva> listar(Long idUsuario) {
        Usuario usuario = usuarioService.buscarPorId(idUsuario);
        return switch (usuario.getPerfil()) {
            case ADMINISTRADOR -> reservaRepository.findAllByOrderByDataAscHoraInicioAsc();
            case DOCENTE -> reservaRepository.findByTurmaDocenteIdOrderByDataAscHoraInicioAsc(idUsuario);
            case DISCENTE -> throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Discentes consultam suas aulas em /aluno/minhas-reservas");
        };
    }

    public Reserva buscarPorId(Long idUsuario, Long id) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        exigirAdminOuDono(usuarioService.buscarPorId(idUsuario), reserva);
        return reserva;
    }

    public void cancelar(Long idUsuario, Long reservaId) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        Usuario usuario = usuarioService.buscarPorId(idUsuario);
        boolean admin = usuario.getPerfil() == Usuario.Perfil.ADMINISTRADOR;
        boolean dono = usuario.getId().equals(reserva.getDocente().getId());
        if (!admin && !dono) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
        reserva.setStatus(StatusReserva.CANCELADA);
        reservaRepository.save(reserva);
    }

    private void exigirAdminOuDono(Usuario usuario, Reserva reserva) {
        boolean ehAdmin = usuario.getPerfil() == Usuario.Perfil.ADMINISTRADOR;
        boolean ehDono = usuario.getPerfil() == Usuario.Perfil.DOCENTE
                && usuario.getId().equals(reserva.getDocente().getId());
        if (!ehAdmin && !ehDono) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
    }


}