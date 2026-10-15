package br.com.cs.sislab.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TurmaDTO {
    @NotBlank
    private String nome;
    @NotBlank
    private String disciplina;
    @NotNull
    private Long docenteId;
}