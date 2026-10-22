package br.com.cs.sislab.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

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
    @Column(unique = true)
    private String email;
    @Column(unique = true)
    private String rgm;

    // Hash BCrypt da senha. Nunca é serializado na API nem impresso no toString.
    @JsonIgnore
    @ToString.Exclude
    private String senhaHash;

    public Usuario(String nome, String email, String rgm, Perfil perfil) {
        this.nome = nome;
        this.email = email;
        this.rgm = rgm;
        this.perfil = perfil;
    }
}
