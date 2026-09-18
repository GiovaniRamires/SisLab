package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Usuario.Perfil;
import lombok.Data;

@Data 
public class UsuarioDTO {
    private Long id;
    private String nome;
    private String email;
    private String rgm;
    private Perfil perfil;
}
