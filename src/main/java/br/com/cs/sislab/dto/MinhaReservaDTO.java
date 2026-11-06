package br.com.cs.sislab.dto;

import java.time.LocalDate;
import java.time.LocalTime;

// Reserva futura do discente, com a máquina em que ele está alocado (se já houver).
public record MinhaReservaDTO(Long reservaId, String disciplina, String turma,
                              String docenteNome, Long laboratorioId, String laboratorioNome, String bloco,
                              LocalDate data, LocalTime horaInicio, LocalTime horaFim,
                              String maquinaIdentificador) {}
