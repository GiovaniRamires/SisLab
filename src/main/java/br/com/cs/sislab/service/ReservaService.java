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
        if (reservaRepository.existeConflito(laboratorioId, data, horaInicio, horaFim, StatusReserva.CONFIRMADA)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O laboratório já está reservado nesse horário");
        }

        return reservaRepository.save(new Reserva(laboratorio, turma, data, horaInicio, horaFim, justificativa));
    }

    public Reserva buscarPorId(Long idUsuario, Long id) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        exigirAdminOuDono(usuarioService.buscarPorId(idUsuario), reserva);
        return reserva;
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