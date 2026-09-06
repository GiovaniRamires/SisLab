package br.com.cs.sislab.controller;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping ("/usuario")
public class UsuarioController {
    @Autowired
    private UsuarioService usuarioService;


    @PostMapping ("/cadastrarDiscente")
    public ResponseEntity<Usuario> cadastroDiscente(@RequestBody Usuario usuario) {
        var novoDiscente = usuarioService.criarDiscente(usuario.getNome(), usuario.getEmail(),
                usuario.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoDiscente);
    }

    @PostMapping ("/cadastrarDocente")
    public ResponseEntity<Usuario> cadastroDocente(@RequestBody Usuario usuario) {
        var novoDocente = usuarioService.criarDocente(usuario.getNome(), usuario.getEmail(),
                usuario.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoDocente);
    }

    @PostMapping ("/cadastrarAdm")
    public ResponseEntity<Usuario> cadastroAdm(@RequestBody Usuario usuario) {
        var novoAdm = usuarioService.criarAdm(usuario.getNome(), usuario.getEmail(),
                usuario.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoAdm);
    }

    @GetMapping("/listaDiscente")
    public ResponseEntity<List<Usuario>> listarDiscentes(){
        var listaDiscente = usuarioService.listarDicentes();
        return ResponseEntity.status(HttpStatus.OK).body(listaDiscente);
    }
    @GetMapping("/listaDocente")
    public ResponseEntity<List<Usuario>> listarDocentes(){
        var listaDocente = usuarioService.listarDocentes();
        return ResponseEntity.status(HttpStatus.OK).body(listaDocente);
    }
    @GetMapping("/listaAdm")
    public ResponseEntity<List<Usuario>> listarAdm(){
        var listaAdm = usuarioService.listarAdms();
        return ResponseEntity.status(HttpStatus.OK).body(listaAdm);
    }
}
