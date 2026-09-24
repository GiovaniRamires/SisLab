package br.com.cs.sislab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LaboratorioDTO {
    private Long id;
    @NotBlank
    private String nome;
    @NotBlank
    private String bloco;
}
