package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Alocacao;

public record AlocacaoRespostaDTO(Long id,
                                  Long reservaId,
                                  Long alunoId, String alunoNome,
                                  Long maquinaId, String maquinaIdentificador) {

    public static AlocacaoRespostaDTO de(Alocacao a) {
        return new AlocacaoRespostaDTO(
                a.getId(),
                a.getReserva().getId(),
                a.getAluno().getId(), a.getAluno().getNome(),
                a.getMaquina().getId(), a.getMaquina().getIdentificador());
    }
}
