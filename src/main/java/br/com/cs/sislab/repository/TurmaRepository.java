package br.com.cs.sislab.repository;

import br.com.cs.sislab.model.Turma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TurmaRepository extends JpaRepository<Turma, Long> {
    List<Turma> findByDocenteId(Long docenteId);
}