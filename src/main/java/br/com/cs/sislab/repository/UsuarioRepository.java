package br.com.cs.sislab.repository;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UsuarioRepository extends JpaRepository <Usuario, Long> {
    List<Usuario> findByPerfil(Perfil perfil);
}
