package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.UsuarioDTO;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.security.UsuarioLogado;
import br.com.cs.sislab.service.UsuarioService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping ("/usuario")
public class UsuarioController {
    private final UsuarioService usuarioService;

    UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    /**
     * Endpoint público (auto-cadastro). Só DISCENTE e DOCENTE podem ser criados anonimamente;
     * criar ADMINISTRADOR exige um administrador autenticado (verificado no banco, não só no token).
     */
    @PostMapping("/cadastrar")
    public ResponseEntity<Usuario> cadastro(Principal principal, @Valid @RequestBody UsuarioDTO usuarioDTO){
        if (usuarioDTO.getSenha() == null || usuarioDTO.getSenha().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha é obrigatória no cadastro");
        }
        var perfil = usuarioDTO.getPerfil();
        if (perfil == Perfil.ADMINISTRADOR && !administradorAutenticado(principal)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente um administrador pode criar outro administrador");
        }
        Usuario novo = switch (perfil) {
            case DISCENTE -> usuarioService.criarDiscente(usuarioDTO.getNome(), usuarioDTO.getEmail(),
                    usuarioDTO.getRgm(), usuarioDTO.getSenha());
            case DOCENTE -> usuarioService.criarDocente(usuarioDTO.getNome(), usuarioDTO.getEmail(),
                    usuarioDTO.getRgm(), usuarioDTO.getSenha());
            case ADMINISTRADOR -> usuarioService.criarAdm(usuarioDTO.getNome(), usuarioDTO.getEmail(),
                    usuarioDTO.getRgm(), usuarioDTO.getSenha());
        };
        return ResponseEntity.status(HttpStatus.CREATED).body(novo);
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

    /** ADMINISTRADOR edita qualquer usuário; os demais só a própria conta e sem trocar o perfil de acesso. */
    @PutMapping("/{id}")
    public ResponseEntity<Usuario> atualizarUsuario(Principal principal, @PathVariable Long id,
                                                    @Valid @RequestBody UsuarioDTO usuarioDTO){
        Long idLogado = UsuarioLogado.id(principal);
        boolean admin = usuarioService.buscarPorId(idLogado).getPerfil() == Perfil.ADMINISTRADOR;
        if (!admin) {
            if (!idLogado.equals(id)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
            }
            if (usuarioService.buscarPorId(id).getPerfil() != usuarioDTO.getPerfil()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O perfil de acesso só pode ser alterado por um administrador");
            }
        }
        Usuario userAtt = usuarioService.atualizarUsuario(id, usuarioDTO.getNome(), usuarioDTO.getEmail(),
                usuarioDTO.getRgm(), usuarioDTO.getPerfil(), usuarioDTO.getSenha());

        return ResponseEntity.status(HttpStatus.OK).body(userAtt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        usuarioService.delete(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private boolean administradorAutenticado(Principal principal) {
        if (principal == null) {
            return false;
        }
        return usuarioService.buscarPorId(UsuarioLogado.id(principal)).getPerfil() == Perfil.ADMINISTRADOR;
    }
}
