package br.com.cs.sislab.service;

import br.com.cs.sislab.model.Turma;
import br.com.cs.sislab.model.Usuario;
import br.com.cs.sislab.model.Usuario.Perfil;
import br.com.cs.sislab.repository.TurmaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TurmaService {
    private final TurmaRepository turmaRepository;
    private final UsuarioService usuarioService;

    public TurmaService(TurmaRepository turmaRepository, UsuarioService usuarioService) {
        this.turmaRepository = turmaRepository;
        this.usuarioService = usuarioService;
    }

    // Só o ADM cria, informando o docente responsável
    public Turma criar(Long idUsuario, String nome, String disciplina, Long docenteId) {
        exigirAdmin(usuarioService.buscarPorId(idUsuario));
        Usuario docente = usuarioService.buscarPorId(docenteId);
        if (docente.getPerfil() != Perfil.DOCENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O responsável pela turma deve ser um docente");
        }
        return turmaRepository.save(new Turma(nome, disciplina, docente));
    }

    public Turma buscarPorId(Long id) {
        return turmaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Turma não encontrada"));
    }

    // Docente dono ou ADM
    public Turma consultar(Long idUsuario, Long id) {
        Turma turma = buscarPorId(id);
        exigirAdminOuDono(usuarioService.buscarPorId(idUsuario), turma);
        return turma;
    }

    // ADM vê todas; docente vê as suas; discente não lista
    public List<Turma> listar(Long idUsuario) {
        Usuario usuario = usuarioService.buscarPorId(idUsuario);
        return switch (usuario.getPerfil()) {
            case ADMINISTRADOR -> turmaRepository.findAll();
            case DOCENTE -> turmaRepository.findByDocenteId(idUsuario);
            case DISCENTE -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        };
    }

    @Transactional
    public Turma matricular(Long idUsuario, Long turmaId, Long alunoId) {
        Turma turma = buscarPorId(turmaId);
        exigirAdminOuDono(usuarioService.buscarPorId(idUsuario), turma);

        Usuario aluno = usuarioService.buscarPorId(alunoId);
        if (aluno.getPerfil() != Perfil.DISCENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas discentes podem ser matriculados");
        }
        if (!turma.matricular(aluno)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aluno já matriculado nesta turma");
        }
        return turmaRepository.save(turma);
    }

    private void exigirAdmin(Usuario usuario) {
        if (usuario.getPerfil() != Perfil.ADMINISTRADOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
    }

    private void exigirAdminOuDono(Usuario usuario, Turma turma) {
        boolean ehAdmin = usuario.getPerfil() == Perfil.ADMINISTRADOR;
        boolean ehDono = usuario.getId().equals(turma.getDocente().getId());
        if (!ehAdmin && !ehDono) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado!");
        }
    }
}