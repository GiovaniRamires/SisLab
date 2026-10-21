package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.MatriculaDTO;
import br.com.cs.sislab.dto.TurmaDTO;
import br.com.cs.sislab.dto.TurmaRespostaDTO;
import br.com.cs.sislab.service.TurmaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// As regras de acesso (ADM / docente dono) são aplicadas no TurmaService a partir do header idUsuario,
// seguindo o mesmo padrão dos demais controllers.
@RestController
@RequestMapping("/turma")
public class TurmaController {
    private final TurmaService turmaService;

    public TurmaController(TurmaService turmaService) {
        this.turmaService = turmaService;
    }

    @PostMapping
    public ResponseEntity<TurmaRespostaDTO> criar(@RequestHeader("idUsuario") Long idUsuario,
                                                  @Valid @RequestBody TurmaDTO dto) {
        var turma = turmaService.criar(idUsuario, dto.getNome(), dto.getDisciplina(), dto.getDocenteId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }

    @GetMapping
    public ResponseEntity<List<TurmaRespostaDTO>> listar(@RequestHeader("idUsuario") Long idUsuario) {
        var turmas = turmaService.listar(idUsuario).stream().map(TurmaRespostaDTO::de).toList();
        return ResponseEntity.ok(turmas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurmaRespostaDTO> buscarPorId(@RequestHeader("idUsuario") Long idUsuario,
                                                        @PathVariable Long id) {
        return ResponseEntity.ok(TurmaRespostaDTO.de(turmaService.consultar(idUsuario, id)));
    }

    @PostMapping("/{id}/alunos")
    public ResponseEntity<TurmaRespostaDTO> matricular(@RequestHeader("idUsuario") Long idUsuario,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody MatriculaDTO dto) {
        var turma = turmaService.matricular(idUsuario, id, dto.getAlunoId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }
}
