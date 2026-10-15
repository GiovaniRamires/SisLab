package br.com.cs.sislab.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ReservaDTO {
    @NotNull
    private Long laboratorioId;
    @NotNull
    private Long turmaId;
    @NotNull
    private LocalDate data;
    @NotNull
    private LocalTime horaInicio;
    @NotNull
    private LocalTime horaFim;
    @Size(max = 255)
    private String justificativa;
}