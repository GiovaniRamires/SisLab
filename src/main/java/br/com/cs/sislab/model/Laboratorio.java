package br.com.cs.sislab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "laboratorio")
@Entity
@Data
@NoArgsConstructor
public class Laboratorio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank
    private String nome;
    @NotBlank
    private String bloco;

    public Laboratorio(String nome, String bloco) {
        this.nome = nome;
        this.bloco = bloco;
    }
}
