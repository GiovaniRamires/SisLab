package br.com.cs.sislab.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class FrontendServerTest {
    @TempDir
    Path base;

    private FrontendServer servidor;
    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void setUp() throws Exception {
        Path site = Files.createDirectories(base.resolve("site"));
        Files.writeString(site.resolve("index.html"), "<h1>SisLab</h1>");
        Files.writeString(site.resolve("app.js"), "export const x = 1;");
        Files.writeString(base.resolve("segredo.txt"), "fora da pasta do front-end");

        servidor = new FrontendServer(true, 0, site); // porta 0 = qualquer porta livre
        servidor.iniciar();
    }

    @AfterEach
    void tearDown() {
        servidor.parar();
    }

    private HttpResponse<String> get(String caminho) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + servidor.portaEmUso() + caminho)).build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    public void raizDeveServirOIndexHtml() throws Exception {
        var resposta = get("/");

        assertEquals(200, resposta.statusCode());
        assertEquals("<h1>SisLab</h1>", resposta.body());
    }

    @Test
    public void javascriptDeveTerTipoMimeDeJavascript() throws Exception {
        var resposta = get("/app.js");

        assertEquals(200, resposta.statusCode());
        assertTrue(resposta.headers().firstValue("Content-Type").orElse("").startsWith("text/javascript"));
    }

    @Test
    public void arquivoInexistenteDeveRetornar404() throws Exception {
        assertEquals(404, get("/nao-existe.js").statusCode());
    }

    @Test
    public void naoDevePermitirSairDaPastaDoFrontend() throws Exception {
        assertEquals(404, get("/..%2Fsegredo.txt").statusCode());
    }
}
