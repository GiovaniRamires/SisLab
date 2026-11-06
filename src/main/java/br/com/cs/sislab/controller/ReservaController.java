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

    @GetMapping
    public ResponseEntity<java.util.List<ReservaRespostaDTO>> listar(Principal principal) {
        var reservas = reservaService.listar(UsuarioLogado.id(principal)).stream()
                .map(ReservaRespostaDTO::de)
                .toList();
        return ResponseEntity.ok(reservas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservaRespostaDTO> buscarPorId(Principal principal,
                                                          @PathVariable Long id) {
        Long idUsuario = UsuarioLogado.id(principal);
        var reserva = reservaService.buscarPorId(idUsuario, id);
        return ResponseEntity.status(HttpStatus.OK).body(ReservaRespostaDTO.de(reserva));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReservaRespostaDTO> atualizar(Principal principal, @PathVariable Long id,
                                                        @Valid @RequestBody ReservaDTO dto) {
        Long idUsuario = UsuarioLogado.id(principal);
        var reserva = reservaService.atualizar(idUsuario, id, dto.getLaboratorioId(), dto.getTurmaId(),
                dto.getData(), dto.getHoraInicio(), dto.getHoraFim(), dto.getJustificativa());
        return ResponseEntity.ok(ReservaRespostaDTO.de(reserva));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelar(Principal principal, @PathVariable Long id) {
        reservaService.cancelar(UsuarioLogado.id(principal), id);
        return ResponseEntity.noContent().build();
    }

}