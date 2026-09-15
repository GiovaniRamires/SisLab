package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioService {
    private static final String USER_NOT_FOUND = "Usuário não encontrado";
    private final UsuarioRepository usuarioRepository;


    UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }
    

    public Usuario criarDocente(String nome, String email, String rgm){
        Usuario docente = new Usuario(nome, email, rgm, Perfil.DOCENTE);
        return usuarioRepository.save(docente);
    }

    public Usuario criarDiscente(String nome, String email, String rgm){
        Usuario discente = new Usuario(nome, email, rgm, Perfil.DISCENTE);

        return usuarioRepository.save(discente);
    }

    public Usuario criarAdm(String nome, String email, String rgm){
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

    public Usuario buscarPorId(Long id){
        return usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException(USER_NOT_FOUND));
    }

    public Usuario atualizarUsuario (Long id, String nome, String email, String rgm, Perfil perfil){
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException(USER_NOT_FOUND));
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setRgm(rgm);
        usuario.setPerfil(perfil);
        usuarioRepository.save(usuario);
        return usuario;
    }

    public void delete (Long id){
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException(USER_NOT_FOUND));
        usuarioRepository.delete(usuario);
    }
}
