package br.com.cs.sislab.controller;

import br.com.cs.sislab.dto.LoginDTO;
import br.com.cs.sislab.dto.LoginRespostaDTO;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginRespostaDTO> login(@Valid @RequestBody LoginDTO loginDTO) {
        Usuario usuario = authService.login(loginDTO.getEmail(), loginDTO.getRgm());
        var resposta = new LoginRespostaDTO(usuario.getId(), usuario.getNome(), usuario.getPerfil());
        return ResponseEntity.status(HttpStatus.OK).body(resposta);
    }
}
