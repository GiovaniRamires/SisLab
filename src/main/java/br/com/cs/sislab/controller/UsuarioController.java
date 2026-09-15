package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.UsuarioDTO;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.service.UsuarioService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping ("/usuario")
public class UsuarioController {
    private final UsuarioService usuarioService;

    UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/cadastrar")
    public ResponseEntity<Usuario> cadastro(@Valid @RequestBody UsuarioDTO usuarioDTO){
        var perfil = usuarioDTO.getPerfil();
        if(perfil != Perfil.DOCENTE && perfil != Perfil.DISCENTE && perfil != Perfil.ADMINISTRADOR){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        if(perfil == Perfil.DISCENTE){
            var novoDiscente = usuarioService.criarDiscente(usuarioDTO.getNome(), usuarioDTO.getEmail(),
                usuarioDTO.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoDiscente);
        } else if (perfil == Perfil.ADMINISTRADOR){
        var novoAdm = usuarioService.criarAdm(usuarioDTO.getNome(), usuarioDTO.getEmail(),
            usuarioDTO.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoAdm);
        } else{
        var novoDocente = usuarioService.criarDocente(usuarioDTO.getNome(), usuarioDTO.getEmail(),
            usuarioDTO.getRgm());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoDocente);
        }
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

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> atualizarUsuario(@PathVariable Long id, @Valid @RequestBody UsuarioDTO usuarioDTO){
        Usuario userAtt = usuarioService.atualizarUsuario(id, usuarioDTO.getNome(), usuarioDTO.getEmail(), usuarioDTO.getRgm(), usuarioDTO.getPerfil());

        return ResponseEntity.status(HttpStatus.OK).body(userAtt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        usuarioService.delete(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
