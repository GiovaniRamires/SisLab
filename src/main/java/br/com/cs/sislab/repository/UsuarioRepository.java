package br.com.cs.sislab.repository;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository <Usuario, Long> {
    List<Usuario> findByPerfil(Perfil perfil);
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario>findByRgm(String rgm);
}
