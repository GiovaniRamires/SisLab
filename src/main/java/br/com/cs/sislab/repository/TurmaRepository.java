package br.com.cs.sislab.repository;

import br.com.cs.sislab.model.Turma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface TurmaRepository extends JpaRepository<Turma, Long> {
    @EntityGraph(attributePaths = {"docente", "alunos"})
    List<Turma> findAll();

    @EntityGraph(attributePaths = {"docente", "alunos"})
    List<Turma> findByDocenteId(Long docenteId);
}