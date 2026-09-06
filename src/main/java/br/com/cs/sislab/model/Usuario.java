package br.com.cs.sislab.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table (name = "usuario")
@Entity
@Data
@NoArgsConstructor

public class Usuario {
    public enum Perfil{
        DOCENTE,
        DISCENTE,
        ADMINISTRADOR
    }
    @Enumerated(EnumType.STRING)
    private Perfil perfil;


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String email;
    private int rgm;

    public Usuario(String nome, String email, int rgm, Perfil perfil) {
        this.nome = nome;
        this.email = email;
        this.rgm = rgm;
        this.perfil = perfil;
    }
}
