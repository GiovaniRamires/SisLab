package br.com.cs.sislab.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlocacaoDTO {
    @NotNull
    private Long alunoId;
    @NotNull
    private Long maquinaId;
}
