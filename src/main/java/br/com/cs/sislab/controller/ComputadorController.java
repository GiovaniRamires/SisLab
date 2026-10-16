package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.ComputadorDTO;
import br.com.cs.sislab.model.Computador;
import br.com.cs.sislab.service.ComputadorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/computador")
public class ComputadorController {
    private final ComputadorService computadorService;


    public ComputadorController(ComputadorService computadorService) {
        this.computadorService = computadorService;
    }

    @PostMapping
    public ResponseEntity<Computador> criar(@RequestHeader("idUsuario") Long idUsuario, @Valid @RequestBody ComputadorDTO computadorDTO) {
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
    public ResponseEntity<Computador> atualizar(@RequestHeader("idUsuario") Long idUsuario, @PathVariable Long id, @Valid @RequestBody ComputadorDTO computadorDTO) {
        var computador = computadorService.atualizar(idUsuario, computadorDTO.getStatus(), id);
        return ResponseEntity.status(HttpStatus.OK).body(computador);
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@RequestHeader("idUsuario") Long idUsuario, @PathVariable Long id) {
    computadorService.deletar(idUsuario, id);
    return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

}
