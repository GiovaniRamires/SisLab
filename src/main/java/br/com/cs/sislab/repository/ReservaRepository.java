package br.com.cs.sislab.repository;

import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.StatusReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    // Reservas de um docente (o docente da reserva vem da turma).
    List<Reserva> findByTurmaDocenteIdOrderByDataAscHoraInicioAsc(Long docenteId);

    // Todas as reservas em ordem cronológica (uso do administrador).
    List<Reserva> findAllByOrderByDataAscHoraInicioAsc();

    // RN01: dois intervalos se sobrepõem quando cada um começa antes de o outro terminar.
    @Query("""
            select count(r) > 0 from Reserva r
            where r.laboratorio.id = :laboratorioId
              and r.data = :data
              and r.status = :status
              and r.horaInicio < :fim
              and r.horaFim > :inicio
            """)
    boolean existeConflito(@Param("laboratorioId") Long laboratorioId,
                           @Param("data") LocalDate data,
                           @Param("inicio") LocalTime inicio,
                           @Param("fim") LocalTime fim,
                           @Param("status") StatusReserva status);


    @Query("""
            select count(r) > 0 from Reserva r
            where r.turma.id = :turmaId
              and r.data = :data
              and r.status = :status
              and r.horaInicio < :fim
              and r.horaFim > :inicio
            """)
    boolean turmaEmConflito(@Param("turmaId") Long turmaId,
                            @Param("data") LocalDate data,
                            @Param("inicio") LocalTime inicio,
                            @Param("fim") LocalTime fim,
                            @Param("status") StatusReserva status);

    // Um docente não pode ter duas reservas sobrepostas (não pode dar duas aulas ao mesmo tempo),
    // mesmo em laboratorios ou turmas diferentes. O docente da reserva vem da turma.
    @Query("""
            select count(r) > 0 from Reserva r
            where r.turma.docente.id = :docenteId
              and r.data = :data
              and r.status = :status
              and r.horaInicio < :fim
              and r.horaFim > :inicio
            """)
    boolean docenteEmConflito(@Param("docenteId") Long docenteId,
                              @Param("data") LocalDate data,
                              @Param("inicio") LocalTime inicio,
                              @Param("fim") LocalTime fim,
                              @Param("status") StatusReserva status);

}