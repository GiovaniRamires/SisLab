package br.com.cs.sislab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "alocacao",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_alocacao_reserva_aluno", columnNames = {"reserva_id", "aluno_id"}),
                @UniqueConstraint(name = "uk_alocacao_reserva_maquina", columnNames = {"reserva_id", "maquina_id"})
        })
@Entity
@Data
@NoArgsConstructor
public class Alocacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "reserva_id")
    private Reserva reserva;

    @ManyToOne(optional = false)
    @JoinColumn(name = "aluno_id")
    private Usuario aluno;

    @ManyToOne(optional = false)
    @JoinColumn(name = "maquina_id")
    private Computador maquina;

    public Alocacao(Reserva reserva, Usuario aluno, Computador maquina) {
        this.reserva = reserva;
        this.aluno = aluno;
        this.maquina = maquina;
    }
}
