package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.MaquinaMapaDTO;
import br.com.cs.sislab.dto.MinhaReservaDTO;
import br.com.cs.sislab.dto.ProximaAulaDTO;
import br.com.cs.sislab.security.UsuarioLogado;
import br.com.cs.sislab.service.AlunoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/aluno")
public class AlunoController {
    private final AlunoService alunoService;

    public AlunoController(AlunoService alunoService) {
        this.alunoService = alunoService;
    }

    @GetMapping("/proxima-aula")
    public ResponseEntity<ProximaAulaDTO> proximaAula(Principal principal) {
        return alunoService.proximaAula(UsuarioLogado.id(principal))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/minhas-reservas")
    public ResponseEntity<List<MinhaReservaDTO>> minhasReservas(Principal principal) {
        return ResponseEntity.ok(alunoService.minhasReservas(UsuarioLogado.id(principal)));
    }

    @GetMapping("/laboratorios/{id}/mapa")
    public ResponseEntity<List<MaquinaMapaDTO>> mapa(Principal principal, @PathVariable Long id) {
        return ResponseEntity.ok(alunoService.mapaDoLaboratorio(UsuarioLogado.id(principal), id));
    }
}
