package br.com.cs.sislab.service;

import br.com.cs.sislab.dto.ProximaAulaDTO;
import br.com.cs.sislab.model.Alocacao;
import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.StatusReserva;
import br.com.cs.sislab.repository.AlocacaoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Optional;

@Service
public class AlunoService {
    private final AlocacaoRepository alocacaoRepository;
    private final UsuarioService usuarioService;

    public AlunoService(AlocacaoRepository alocacaoRepository, UsuarioService usuarioService) {
        this.alocacaoRepository = alocacaoRepository;
        this.usuarioService = usuarioService;
    }

    public Optional<ProximaAulaDTO> proximaAula(Long idUsuario) {
        usuarioService.buscarPorId(idUsuario); // garante que o usuário existe (404 se não)
        LocalDateTime agora = LocalDateTime.now();

        return alocacaoRepository.findByAlunoId(idUsuario).stream()
                // só reservas confirmadas e que ainda não terminaram
                .filter(a -> a.getReserva().getStatus() == StatusReserva.CONFIRMADA)
                .filter(a -> fim(a.getReserva()).isAfter(agora))
                // a mais próxima no tempo
                .min(Comparator.comparing(a -> inicio(a.getReserva())))
                .map(this::montar);
    }

    private LocalDateTime inicio(Reserva r) {
        return LocalDateTime.of(r.getData(), r.getHoraInicio());
    }

    private LocalDateTime fim(Reserva r) {
        return LocalDateTime.of(r.getData(), r.getHoraFim());
    }

    private ProximaAulaDTO montar(Alocacao a) {
        Reserva r = a.getReserva();
        return new ProximaAulaDTO(
                r.getId(),
                r.getTurma().getDisciplina(),
                r.getTurma().getNome(),
                r.getDocente().getNome(),
                r.getLaboratorio().getNome(),
                r.getData(),
                r.getHoraInicio(),
                r.getHoraFim(),
                a.getMaquina().getIdentificador());
    }
}
