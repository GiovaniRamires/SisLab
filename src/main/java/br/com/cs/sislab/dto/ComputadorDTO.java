package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Computador;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComputadorDTO {
    private Long id;
    @NotBlank
    private String identificador;
    @NotNull
    private Computador.StatusComputador status;
    @NotNull
    private Long laboratorioId;

}
