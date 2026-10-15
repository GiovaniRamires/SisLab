package br.com.cs.sislab.repository;

import br.com.cs.sislab.model.Reserva;
import br.com.cs.sislab.model.StatusReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

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
}