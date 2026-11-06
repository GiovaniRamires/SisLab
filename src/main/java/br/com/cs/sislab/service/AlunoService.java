package br.com.cs.sislab.service;

import br.com.cs.sislab.dto.MaquinaMapaDTO;
import br.com.cs.sislab.dto.MinhaReservaDTO;
import br.com.cs.sislab.dto.ProximaAulaDTO;
import br.com.cs.sislab.model.Alocacao;
import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.StatusReserva;
import br.com.cs.sislab.repository.AlocacaoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class AlunoService {
    private final AlocacaoRepository alocacaoRepository;
    private final UsuarioService usuarioService;
    private final ComputadorService computadorService;

    public AlunoService(AlocacaoRepository alocacaoRepository, UsuarioService usuarioService,
                        ComputadorService computadorService) {
        this.alocacaoRepository = alocacaoRepository;
        this.usuarioService = usuarioService;
        this.computadorService = computadorService;
    }

    public Optional<ProximaAulaDTO> proximaAula(Long idUsuario) {
        return alocacoesFuturas(idUsuario).stream()
                .min(Comparator.comparing(a -> inicio(a.getReserva())))
                .map(this::montarProxima);
    }

    // Reservas futuras do aluno (onde ele está alocado), em ordem cronológica.
    public List<MinhaReservaDTO> minhasReservas(Long idUsuario) {
        return alocacoesFuturas(idUsuario).stream()
                .sorted(Comparator.comparing(a -> inicio(a.getReserva())))
                .map(this::montarReserva)
                .toList();
    }

    // Mapa de um laboratório, acessível ao aluno apenas se ele tiver aula futura nele.
    public List<MaquinaMapaDTO> mapaDoLaboratorio(Long idUsuario, Long laboratorioId) {
        boolean temAula = alocacoesFuturas(idUsuario).stream()
                .anyMatch(a -> a.getReserva().getLaboratorio().getId().equals(laboratorioId));
        if (!temAula) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Você não tem aula neste laboratório");
        }
        return computadorService.listarPorLaboratorio(laboratorioId).stream()
                .map(MaquinaMapaDTO::de)
                .toList();
    }

    private List<Alocacao> alocacoesFuturas(Long idUsuario) {
        usuarioService.buscarPorId(idUsuario); // garante que o usuário existe (404 se não)
        LocalDateTime agora = LocalDateTime.now();
        return alocacaoRepository.findByAlunoId(idUsuario).stream()
                .filter(a -> a.getReserva().getStatus() == StatusReserva.CONFIRMADA)
                .filter(a -> fim(a.getReserva()).isAfter(agora))
                .toList();
    }

    private LocalDateTime inicio(Reserva r) {
        return LocalDateTime.of(r.getData(), r.getHoraInicio());
    }

    private LocalDateTime fim(Reserva r) {
        return LocalDateTime.of(r.getData(), r.getHoraFim());
    }

    private ProximaAulaDTO montarProxima(Alocacao a) {
        Reserva r = a.getReserva();
        return new ProximaAulaDTO(
                r.getId(), r.getTurma().getDisciplina(), r.getTurma().getNome(),
                r.getDocente().getNome(), r.getLaboratorio().getNome(),
                r.getData(), r.getHoraInicio(), r.getHoraFim(),
                a.getMaquina().getIdentificador());
    }

    private MinhaReservaDTO montarReserva(Alocacao a) {
        Reserva r = a.getReserva();
        return new MinhaReservaDTO(
                r.getId(), r.getTurma().getDisciplina(), r.getTurma().getNome(),
                r.getDocente().getNome(),
                r.getLaboratorio().getId(), r.getLaboratorio().getNome(), r.getLaboratorio().getBloco(),
                r.getData(), r.getHoraInicio(), r.getHoraFim(),
                a.getMaquina().getIdentificador());
    }
}
