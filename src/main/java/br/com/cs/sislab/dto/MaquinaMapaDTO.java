package br.com.cs.sislab.dto;

import br.com.cs.sislab.model.Computador;

public record MaquinaMapaDTO(Long id, String identificador, Computador.StatusComputador status) {
public static MaquinaMapaDTO de(Computador c){
    return new MaquinaMapaDTO(c.getId(), c.getIdentificador(), c.getStatus());
}
}
