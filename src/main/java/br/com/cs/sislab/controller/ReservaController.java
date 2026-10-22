package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.ReservaDTO;
import br.com.cs.sislab.dto.ReservaRespostaDTO;
import br.com.cs.sislab.service.ReservaService;
import br.com.cs.sislab.security.UsuarioLogado;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/reserva")
public class ReservaController {
    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @PostMapping
    public ResponseEntity<ReservaRespostaDTO> criar(Principal principal,
                                                    @Valid @RequestBody ReservaDTO dto) {
        Long idUsuario = UsuarioLogado.id(principal);
        var reserva = reservaService.criar(idUsuario, dto.getLaboratorioId(), dto.getTurmaId(),
                dto.getData(), dto.getHoraInicio(), dto.getHoraFim(), dto.getJustificativa());
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservaRespostaDTO.de(reserva));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservaRespostaDTO> buscarPorId(Principal principal,
                                                          @PathVariable Long id) {
        Long idUsuario = UsuarioLogado.id(principal);
        var reserva = reservaService.buscarPorId(idUsuario, id);
        return ResponseEntity.status(HttpStatus.OK).body(ReservaRespostaDTO.de(reserva));
    }
}