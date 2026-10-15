package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.StatusReserva;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservaRespostaDTO {
    private Long id;
    private Long laboratorioId;
    private String laboratorioNome;
    private String bloco;
    private Long turmaId;
    private String turmaNome;
    private String disciplina;
    private Long docenteId;
    private String docenteNome;
    private LocalDate data;
    private LocalTime horaInicio;
    private LocalTime horaFim;
    private String justificativa;
    private StatusReserva status;

    public static ReservaRespostaDTO de(Reserva r) {
        return new ReservaRespostaDTO(
                r.getId(),
                r.getLaboratorio().getId(), r.getLaboratorio().getNome(), r.getLaboratorio().getBloco(),
                r.getTurma().getId(), r.getTurma().getNome(), r.getTurma().getDisciplina(),
                r.getDocente().getId(), r.getDocente().getNome(),
                r.getData(), r.getHoraInicio(), r.getHoraFim(), r.getJustificativa(), r.getStatus());
    }
}