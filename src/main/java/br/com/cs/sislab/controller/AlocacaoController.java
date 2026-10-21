package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.AlocacaoDTO;
import br.com.cs.sislab.dto.AlocacaoRespostaDTO;
import br.com.cs.sislab.service.AlocacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reserva/{reservaId}/alocacoes")
public class AlocacaoController {
    private final AlocacaoService alocacaoService;

    public AlocacaoController(AlocacaoService alocacaoService) {
        this.alocacaoService = alocacaoService;
    }

    @PostMapping
    public ResponseEntity<AlocacaoRespostaDTO> alocar(@RequestHeader("idUsuario") Long idUsuario,
                                                      @PathVariable Long reservaId,
                                                      @Valid @RequestBody AlocacaoDTO dto) {
        var alocacao = alocacaoService.alocar(idUsuario, reservaId, dto.getAlunoId(), dto.getMaquinaId());
        return ResponseEntity.status(HttpStatus.CREATED).body(AlocacaoRespostaDTO.de(alocacao));
    }

    @GetMapping
    public ResponseEntity<List<AlocacaoRespostaDTO>> listar(@RequestHeader("idUsuario") Long idUsuario,
                                                            @PathVariable Long reservaId) {
        var alocacoes = alocacaoService.listarPorReserva(idUsuario, reservaId).stream()
                .map(AlocacaoRespostaDTO::de)
                .toList();
        return ResponseEntity.ok(alocacoes);
    }
}
