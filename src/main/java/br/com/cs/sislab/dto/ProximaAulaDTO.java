import java.time.LocalDate;
import java.time.LocalTime;

public record ProximaAulaDTO(Long reservaId, String disciplina, String turma,
                             String docenteNome, String laboratorioNome,
                             LocalDate data, LocalTime horaInicio, LocalTime horaFim,
                             String maquinaIdentificador) {}
