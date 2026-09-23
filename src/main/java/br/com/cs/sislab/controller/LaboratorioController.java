package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.LaboratorioDTO;
import br.com.cs.sislab.model.Laboratorio;
import br.com.cs.sislab.service.LaboratorioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping ("/laboratorio")
public class LaboratorioController {
    private final LaboratorioService laboratorioService;

    public LaboratorioController(LaboratorioService laboratorioService) {
        this.laboratorioService = laboratorioService;
    }

    @PostMapping
    public ResponseEntity<Laboratorio> criar (@RequestHeader("idUsuario") Long idUsuario,@RequestBody LaboratorioDTO laboratorioDTO){
        var laboratorio = laboratorioService.criar(idUsuario, laboratorioDTO.getNome(), laboratorioDTO.getBloco());
        return ResponseEntity.status(HttpStatus.CREATED).body(laboratorio);
    }

    @GetMapping
    public ResponseEntity<List<Laboratorio>> listar (){
        var laboratorio = laboratorioService.listar();
        return ResponseEntity.status(HttpStatus.OK).body(laboratorio);
    }

    @GetMapping ("/{id}")
    public ResponseEntity<Laboratorio> buscarPorId (@PathVariable Long id){
        var laboratorio = laboratorioService.buscarPorId(id);
        return ResponseEntity.status(HttpStatus.OK).body(laboratorio);
    }

    @PutMapping ("/{id}")
    public ResponseEntity<Laboratorio> atualizar (@RequestHeader("idUsuario") Long idUsuario, @PathVariable Long id, @RequestBody LaboratorioDTO laboratorioDTO){
        var laboratorio = laboratorioService.atualizar(idUsuario, id, laboratorioDTO.getNome(), laboratorioDTO.getBloco());
        return ResponseEntity.status(HttpStatus.OK).body(laboratorio);
    }

    @DeleteMapping ("/{id}")
    public ResponseEntity<Void> delete (@RequestHeader("idUsuario") Long idUsuario, @PathVariable Long id){
        laboratorioService.delete(idUsuario, id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

}
