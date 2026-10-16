package br.com.cs.sislab.service;




import br.com.cs.sislab.model.Computador;
import br.com.cs.sislab.model.Laboratorio;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.repository.ComputadorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ComputadorService  {
    private final UsuarioService usuarioService;
    private final ComputadorRepository computadorRepository;
    private final LaboratorioService laboratorioService;

    public ComputadorService(LaboratorioService laboratorioService, ComputadorRepository computadorRepository, UsuarioService usuarioService){
        this.computadorRepository = computadorRepository;
        this.usuarioService = usuarioService;
        this.laboratorioService = laboratorioService;
    }

    public Computador criar (Long idLaboratorio, String identificador, Long idUsuario, Computador.StatusComputador status){
        ehAdmin(idUsuario);
        Laboratorio laboratorio = laboratorioService.buscarPorId(idLaboratorio);
        Computador computador  = new Computador(identificador, status, laboratorio);
        return computadorRepository.save(computador);
    }

    public List<Computador> listar(){
        return computadorRepository.findAll();
    }



    public Computador buscarPorId(Long id){
        return computadorRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Id não encontrado"));
    }

    public Computador atualizar (Long idUsuario, Computador.StatusComputador status, Long id){
        ehAdmin(idUsuario);
        Computador computador = buscarPorId(id);
        computador.setStatus(status);
        computadorRepository.save(computador);
        return computador;
    }

    public void deletar (Long idUsuario, Long id){
        ehAdmin(idUsuario);
        var computador = buscarPorId(id);
         computadorRepository.delete(computador);
    }

    private void ehAdmin(long idUsuario){
        var usuario = usuarioService.buscarPorId(idUsuario);
        if(usuario.getPerfil() != Usuario.Perfil.ADMINISTRADOR){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
     }


}
