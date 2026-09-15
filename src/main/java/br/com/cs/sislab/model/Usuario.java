package br.com.cs.sislab.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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

    @NotBlank 
    private String nome;
    @Email 
    private String email;
    private String rgm;

    public Usuario(String nome, String email, String rgm, Perfil perfil) {
        this.nome = nome;
        this.email = email;
        this.rgm = rgm;
        this.perfil = perfil;
    }
}
