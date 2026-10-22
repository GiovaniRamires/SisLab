package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UsuarioService {
    private static final String USER_NOT_FOUND = "Usuário não encontrado";
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;


    UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }
    

    public Usuario criarDocente(String nome, String email, String rgm, String senha){
        return criar(nome, email, rgm, senha, Perfil.DOCENTE);
    }

    public Usuario criarDiscente(String nome, String email, String rgm, String senha){
        return criar(nome, email, rgm, senha, Perfil.DISCENTE);
    }

    public Usuario criarAdm(String nome, String email, String rgm, String senha){
        return criar(nome, email, rgm, senha, Perfil.ADMINISTRADOR);
    }

    private Usuario criar(String nome, String email, String rgm, String senha, Perfil perfil){
        Usuario usuario = new Usuario(nome, email, rgm, perfil);
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        return usuarioRepository.save(usuario);
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
        return usuarioRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND));
    }

    public Usuario atualizarUsuario (Long id, String nome, String email, String rgm, Perfil perfil, String novaSenha){
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND));
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setRgm(rgm);
        usuario.setPerfil(perfil);
        if (novaSenha != null && !novaSenha.isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        }
        usuarioRepository.save(usuario);
        return usuario;
    }

    public void validarUnicidade(String email, String rgm, Long idAtual){
        usuarioRepository.findByEmail(email).ifPresent(u ->{
            if(!u.getId().equals(idAtual)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email já cadastrado!");
        });
        usuarioRepository.findByRgm(rgm).ifPresent(u ->{
        if(!u.getId().equals(idAtual)) throw new ResponseStatusException(HttpStatus.CONFLICT, "RGM já cadastrado!");
        }
        );
    }

    public void delete (Long id){
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND));
        usuarioRepository.delete(usuario);
    }
}
