package br.com.cs.sislab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Table(name = "reserva")
@Entity
@Data
@NoArgsConstructor
public class Reserva {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Laboratorio laboratorio;

    @ManyToOne(optional = false)
    private Turma turma;

    @NotNull
    private LocalDate data;
    @NotNull
    private LocalTime horaInicio;
    @NotNull
    private LocalTime horaFim;

    private String justificativa;

    @Enumerated(EnumType.STRING)
    @NotNull
    private StatusReserva status = StatusReserva.CONFIRMADA;

    public Reserva(Laboratorio laboratorio, Turma turma, LocalDate data,
                   LocalTime horaInicio, LocalTime horaFim, String justificativa) {
        this.laboratorio = laboratorio;
        this.turma = turma;
        this.data = data;
        this.horaInicio = horaInicio;
        this.horaFim = horaFim;
        this.justificativa = justificativa;
    }

    public Usuario getDocente() {
        return turma.getDocente();
    }
}