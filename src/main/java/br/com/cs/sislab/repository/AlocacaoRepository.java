package br.com.cs.sislab.repository;

import br.com.cs.sislab.model.Alocacao;
import br.com.cs.sislab.model.Computador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlocacaoRepository extends JpaRepository<Alocacao, Long> {

    List<Alocacao> findByReservaId(Long reservaId);

    boolean existsByReservaIdAndAlunoId(Long reservaId, Long alunoId);

    boolean existsByReservaIdAndMaquinaId(Long reservaId, Long maquinaId);

    long countByReservaId(Long reservaId);

    // RN02: máquinas ATIVAS do laboratório definem o teto de alunos alocáveis.
    @Query("""
            select count(c) from Computador c
            where c.laboratorio.id = :laboratorioId
              and c.status = :status
            """)
    long contarMaquinasPorStatus(@Param("laboratorioId") Long laboratorioId,
                                 @Param("status") Computador.StatusComputador status);
}
