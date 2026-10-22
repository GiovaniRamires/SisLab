package br.com.cs.sislab.security;

import br.com.cs.sislab.service.UsuarioService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * O cadastro público não cria ADMINISTRADOR, então alguém precisa ser o primeiro.
 * Na inicialização, se não existir nenhum administrador, cria o definido em application.properties.
 */
@Component
public class AdminInicializador implements ApplicationRunner {
    private final UsuarioService usuarioService;
    private final String nome;
    private final String email;
    private final String rgm;
    private final String senha;

    public AdminInicializador(UsuarioService usuarioService,
                              @Value("${sislab.admin-inicial.nome}") String nome,
                              @Value("${sislab.admin-inicial.email}") String email,
                              @Value("${sislab.admin-inicial.rgm}") String rgm,
                              @Value("${sislab.admin-inicial.senha}") String senha) {
        this.usuarioService = usuarioService;
        this.nome = nome;
        this.email = email;
        this.rgm = rgm;
        this.senha = senha;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (usuarioService.listarAdms().isEmpty()) {
            usuarioService.criarAdm(nome, email, rgm, senha);
        }
    }
}
