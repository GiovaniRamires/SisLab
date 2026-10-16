package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.ReservaDTO;
import br.com.cs.sislab.dto.ReservaRespostaDTO;
import br.com.cs.sislab.service.ReservaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reserva")
public class ReservaController {
    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @PostMapping
    public ResponseEntity<ReservaRespostaDTO> criar(@RequestHeader("idUsuario") Long idUsuario,
                                                    @Valid @RequestBody ReservaDTO dto) {
        var reserva = reservaService.criar(idUsuario, dto.getLaboratorioId(), dto.getTurmaId(),
                dto.getData(), dto.getHoraInicio(), dto.getHoraFim(), dto.getJustificativa());
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservaRespostaDTO.de(reserva));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservaRespostaDTO> buscarPorId(@RequestHeader("idUsuario") Long idUsuario,
                                                          @PathVariable Long id) {
        var reserva = reservaService.buscarPorId(idUsuario, id);
        return ResponseEntity.status(HttpStatus.OK).body(ReservaRespostaDTO.de(reserva));
    }
}