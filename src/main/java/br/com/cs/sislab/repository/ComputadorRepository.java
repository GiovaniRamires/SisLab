package br.com.cs.sislab.repository;
import br.com.cs.sislab.model.Computador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComputadorRepository extends JpaRepository<Computador, Long> {
    List<Computador> findByLaboratorioId(Long laboratorioId);
}
