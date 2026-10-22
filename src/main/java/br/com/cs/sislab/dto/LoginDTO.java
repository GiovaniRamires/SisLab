package br.com.cs.sislab.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginDTO {
    @NotBlank @Email
    private String email;
    @NotBlank
    private String senha;
}
