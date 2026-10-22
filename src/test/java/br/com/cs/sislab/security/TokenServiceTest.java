package br.com.cs.sislab.security;

import br.com.cs.sislab.model.Usuario;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

public class TokenServiceTest {
    private static final String SEGREDO = "segredo-de-teste-com-pelo-menos-32-bytes!!";

    private SecretKey chave;
    private JwtDecoder decoder;
    private TokenService tokenService;
    private Usuario docente;

    @BeforeEach
    void setUp() {
        chave = new SecretKeySpec(SEGREDO.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        decoder = NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(MacAlgorithm.HS256).build();
        tokenService = new TokenService(new NimbusJwtEncoder(new ImmutableSecret<>(chave)), 60);

        docente = new Usuario("Ana", "ana@email.com", "1", Usuario.Perfil.DOCENTE);
        docente.setId(7L);
    }

    @Test
    public void tokenGeradoDeveConterIdEPerfil() {
        String token = tokenService.gerar(docente);

        Jwt jwt = decoder.decode(token);

        assertEquals("7", jwt.getSubject());
        assertEquals("DOCENTE", jwt.getClaimAsString("perfil"));
        assertEquals("sislab", jwt.getClaimAsString("iss"));
    }

    @Test
    public void tokenAssinadoComOutraChaveDeveSerRejeitado() {
        String token = tokenService.gerar(docente);
        SecretKey outraChave = new SecretKeySpec("outra-chave-bem-diferente-32-bytes!!!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtDecoder outroDecoder = NimbusJwtDecoder.withSecretKey(outraChave).macAlgorithm(MacAlgorithm.HS256).build();

        assertThrows(JwtException.class, () -> outroDecoder.decode(token));
    }

    @Test
    public void tokenExpiradoDeveSerRejeitado() {
        TokenService expirado = new TokenService(new NimbusJwtEncoder(new ImmutableSecret<>(chave)), -5);
        String token = expirado.gerar(docente);

        assertThrows(JwtException.class, () -> decoder.decode(token));
    }
}
