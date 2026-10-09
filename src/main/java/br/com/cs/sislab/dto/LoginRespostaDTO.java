package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Usuario.Perfil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRespostaDTO {
    private Long id;
    private String nome;
    private Perfil perfil;
}
