package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.ComputadorDTO;
import br.com.cs.sislab.model.Computador;
import br.com.cs.sislab.service.ComputadorService;
import br.com.cs.sislab.security.UsuarioLogado;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

import java.util.List;


@RestController
@RequestMapping("/computador")
public class ComputadorController {
    private final ComputadorService computadorService;


    public ComputadorController(ComputadorService computadorService) {
        this.computadorService = computadorService;
    }

    @PostMapping
    public ResponseEntity<Computador> criar(Principal principal, @Valid @RequestBody ComputadorDTO computadorDTO) {
        Long idUsuario = UsuarioLogado.id(principal);
       var computador = computadorService.criar(computadorDTO.getLaboratorioId(), computadorDTO.getIdentificador(), idUsuario, computadorDTO.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(computador);
    }

    @GetMapping
    public ResponseEntity<List<Computador>> listar() {
        return ResponseEntity.status(HttpStatus.OK).body(computadorService.listar());
    }

    @GetMapping("/{id}")
    public  ResponseEntity<Computador> buscarPorId(@PathVariable Long id){
        var computador = computadorService.buscarPorId(id);
        return ResponseEntity.status(HttpStatus.OK).body(computador);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Computador> atualizar(Principal principal, @PathVariable Long id, @Valid @RequestBody ComputadorDTO computadorDTO) {
        Long idUsuario = UsuarioLogado.id(principal);
        var computador = computadorService.atualizar(idUsuario, computadorDTO.getStatus(), id);
        return ResponseEntity.status(HttpStatus.OK).body(computador);
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(Principal principal, @PathVariable Long id) {
        Long idUsuario = UsuarioLogado.id(principal);
    computadorService.deletar(idUsuario, id);
    return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

}
