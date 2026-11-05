import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

@GetMapping("/proxima-aula")
public ResponseEntity<ProximaAulaDTO> proximaAula(Principal principal) {
    return alunoService.proximaAula(UsuarioLogado.id(principal))
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build()); // 204 = sem aula
}
