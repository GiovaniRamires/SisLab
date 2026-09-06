package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    public Usuario criarDocente(String nome, String email, int rgm){
        Usuario docente = new Usuario(nome, email, rgm, Perfil.DOCENTE);
        return usuarioRepository.save(docente);
    }

    public Usuario criarDiscente(String nome, String email, int rgm){
        Usuario discente = new Usuario(nome, email, rgm, Perfil.DISCENTE);

        return usuarioRepository.save(discente);
    }

    public Usuario criarAdm(String nome, String email, int rgm){
        Usuario adm = new Usuario(nome, email, rgm, Perfil.ADMINISTRADOR);
        return usuarioRepository.save(adm);
    }

    public List<Usuario> listarDocentes() {
        return usuarioRepository.findByPerfil(Perfil.DOCENTE);
    }


    public List<Usuario> listarDicentes() {
        return usuarioRepository.findByPerfil(Perfil.DISCENTE);
    }


    public List<Usuario> listarAdms() {
        return usuarioRepository.findByPerfil(Perfil.ADMINISTRADOR);
    }

}
