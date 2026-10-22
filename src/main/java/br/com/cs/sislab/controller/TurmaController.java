package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.MatriculaDTO;
import br.com.cs.sislab.dto.TurmaDTO;
import br.com.cs.sislab.dto.TurmaRespostaDTO;
import br.com.cs.sislab.service.TurmaService;
import br.com.cs.sislab.security.UsuarioLogado;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/turma")
public class TurmaController {
    private final TurmaService turmaService;

    public TurmaController(TurmaService turmaService) {
        this.turmaService = turmaService;
    }

    @PostMapping
    public ResponseEntity<TurmaRespostaDTO> criar(Principal principal,
                                                  @Valid @RequestBody TurmaDTO dto) {
        Long idUsuario = UsuarioLogado.id(principal);
        var turma = turmaService.criar(idUsuario, dto.getNome(), dto.getDisciplina(), dto.getDocenteId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }

    @GetMapping
    public ResponseEntity<List<TurmaRespostaDTO>> listar(Principal principal) {
        Long idUsuario = UsuarioLogado.id(principal);
        var turmas = turmaService.listar(idUsuario).stream().map(TurmaRespostaDTO::de).toList();
        return ResponseEntity.ok(turmas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurmaRespostaDTO> buscarPorId(Principal principal,
                                                        @PathVariable Long id) {
        Long idUsuario = UsuarioLogado.id(principal);
        return ResponseEntity.ok(TurmaRespostaDTO.de(turmaService.consultar(idUsuario, id)));
    }

    @PostMapping("/{id}/alunos")
    public ResponseEntity<TurmaRespostaDTO> matricular(Principal principal,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody MatriculaDTO dto) {
        Long idUsuario = UsuarioLogado.id(principal);
        var turma = turmaService.matricular(idUsuario, id, dto.getAlunoId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }
}
