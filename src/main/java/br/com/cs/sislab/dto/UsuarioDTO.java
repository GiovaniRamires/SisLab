package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Usuario.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data 
public class UsuarioDTO {
    private Long id;
    @NotBlank
    private String nome;
    @NotBlank @Email
    private String email;
    @NotBlank
    private String rgm;
    @NotNull
    private Perfil perfil;
}
