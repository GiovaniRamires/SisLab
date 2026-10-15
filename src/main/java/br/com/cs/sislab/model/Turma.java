package br.com.cs.sislab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

@Table(name = "turma")
@Entity
@Data
@NoArgsConstructor
public class Turma {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String nome;

    @NotBlank
    private String disciplina;

    @ManyToOne(optional = false)
    private Usuario docente;

    @ManyToMany
    @JoinTable(name = "turma_aluno",
            joinColumns = @JoinColumn(name = "turma_id"),
            inverseJoinColumns = @JoinColumn(name = "aluno_id"))
    @ToString.Exclude
    private Set<Usuario> alunos = new HashSet<>();

    public Turma(String nome, String disciplina, Usuario docente) {
        this.nome = nome;
        this.disciplina = disciplina;
        this.docente = docente;
    }

    public boolean matricular(Usuario aluno) {
        return alunos.add(aluno);
    }

    public boolean possuiAluno(Usuario aluno) {
        return alunos.contains(aluno);
    }
}