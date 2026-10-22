package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Usuario.Perfil;

/** Resposta do login: token JWT + dados do usuário exibidos pelo front-end. */
public record LoginRespostaDTO(String token, Long id, String nome, String email, String rgm, Perfil perfil) {
}
