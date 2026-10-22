package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Usuario.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    // Obrigatória no cadastro; na atualização, se omitida, a senha atual é mantida.
    // Máximo de 72 por causa do limite do BCrypt.
    @Size(min = 8, max = 72)
    private String senha;
}
