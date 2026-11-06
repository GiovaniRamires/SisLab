package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.ProximaAulaDTO;
import br.com.cs.sislab.security.UsuarioLogado;
import br.com.cs.sislab.service.AlunoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

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
}
