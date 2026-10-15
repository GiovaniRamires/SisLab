package br.com.cs.sislab.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MatriculaDTO {
    @NotNull
    private Long alunoId;
}