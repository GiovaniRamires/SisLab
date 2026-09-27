package br.com.cs.sislab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "computador")
@Entity
@Data
@NoArgsConstructor

public class Computador {


    public enum StatusComputador{
        ATIVO,
       EM_MANUTENCAO,
        DESATIVADO
    }
    @Enumerated(EnumType.STRING)
    private StatusComputador status;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long id;
    @NotBlank
    private String identificador;

    @ManyToOne
    @JoinColumn(name = "laboratorio_id")
    private Laboratorio laboratorio;

    public Computador(String identificador, StatusComputador status, Laboratorio laboratorio) {

        this.identificador = identificador;
        this.status = status;
        this.laboratorio = laboratorio;
    }

}
