package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Laboratorio;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.LaboratorioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class LaboratorioService {
    private final LaboratorioRepository laboratorioRepository;
    private final UsuarioService usuarioService;


    public LaboratorioService(LaboratorioRepository laboratorioRepository, UsuarioService usuarioService) {
        this.laboratorioRepository = laboratorioRepository;
        this.usuarioService = usuarioService;
    }

    public Laboratorio criar (Long idUsuario, String nome, String bloco){
        ehAdmin(idUsuario);
        Laboratorio laboratorio = new Laboratorio(nome, bloco);
        return laboratorioRepository.save(laboratorio);
    }



    public List<Laboratorio> listar (){
        return laboratorioRepository.findAll();
    }

    public Laboratorio buscarPorId(Long id){
        return laboratorioRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Id não encontrado"));
    }

    public Laboratorio atualizar (Long idUsuario, Long id, String nome, String bloco){
        ehAdmin(idUsuario);
        var laboratorio = buscarPorId(id);
        laboratorio.setNome(nome);
        laboratorio.setBloco(bloco);
        laboratorioRepository.save(laboratorio);
        return laboratorio;
    }

    public void delete (Long idUsuario, Long id){
        ehAdmin(idUsuario);
        var laboratorio = buscarPorId(id);
        laboratorioRepository.delete(laboratorio);
    }


    private void ehAdmin(Long idUsuario) {
        var usuario = usuarioService.buscarPorId(idUsuario);
        if(usuario.getPerfil() != Usuario.Perfil.ADMINISTRADOR){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Acesso negado!");
        }
    }
}
