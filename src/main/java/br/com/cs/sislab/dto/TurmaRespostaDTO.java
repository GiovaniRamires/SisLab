package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Turma;

import java.util.Comparator;
import java.util.List;

public record TurmaRespostaDTO(Long id, String nome, String disciplina,
                               Long docenteId, String docenteNome,
                               List<AlunoResumo> alunos) {

    public record AlunoResumo(Long id, String nome) {}

    public static TurmaRespostaDTO de(Turma t) {
        List<AlunoResumo> alunos = t.getAlunos().stream()
                .map(a -> new AlunoResumo(a.getId(), a.getNome()))
                .sorted(Comparator.comparing(AlunoResumo::nome))
                .toList();
        return new TurmaRespostaDTO(t.getId(), t.getNome(), t.getDisciplina(),
                t.getDocente().getId(), t.getDocente().getNome(), alunos);
    }
}