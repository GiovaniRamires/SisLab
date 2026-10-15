package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.MatriculaDTO;
import br.com.cs.sislab.dto.TurmaDTO;
import br.com.cs.sislab.dto.TurmaRespostaDTO;
import br.com.cs.sislab.service.TurmaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    public ResponseEntity<TurmaRespostaDTO> criar(@RequestHeader("idUsuario") Long idUsuario,
                                                  Principal principal,
                                                  @Valid @RequestBody TurmaDTO dto) {
        validarUsuarioAutenticado(idUsuario, principal);
        var turma = turmaService.criar(idUsuario, dto.getNome(), dto.getDisciplina(), dto.getDocenteId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }

    @GetMapping
    public ResponseEntity<List<TurmaRespostaDTO>> listar(@RequestHeader("idUsuario") Long idUsuario,
                                                        Principal principal) {
        validarUsuarioAutenticado(idUsuario, principal);
        var turmas = turmaService.listar(idUsuario).stream().map(TurmaRespostaDTO::de).toList();
        return ResponseEntity.ok(turmas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurmaRespostaDTO> buscarPorId(@RequestHeader("idUsuario") Long idUsuario,
                                                        Principal principal,
                                                        @PathVariable Long id) {
        validarUsuarioAutenticado(idUsuario, principal);
        return ResponseEntity.ok(TurmaRespostaDTO.de(turmaService.consultar(idUsuario, id)));
    }

    @PostMapping("/{id}/alunos")
    public ResponseEntity<TurmaRespostaDTO> matricular(@RequestHeader("idUsuario") Long idUsuario,
                                                       Principal principal,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody MatriculaDTO dto) {
        validarUsuarioAutenticado(idUsuario, principal);
        var turma = turmaService.matricular(idUsuario, id, dto.getAlunoId());
        return ResponseEntity.status(HttpStatus.CREATED).body(TurmaRespostaDTO.de(turma));
    }

    private void validarUsuarioAutenticado(Long idUsuario, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }
        if (!String.valueOf(idUsuario).equals(principal.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
    }
}