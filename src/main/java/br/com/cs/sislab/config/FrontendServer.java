package br.com.cs.sislab.config;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Map;

/**
 * Serve a pasta do front-end (arquivos estáticos) numa porta própria, junto com o backend.
 * Usa o servidor HTTP embutido do JDK, sem dependências extras: ao iniciar a API, o front já está no ar.
 */
@Component
public class FrontendServer {
    private static final Logger log = LoggerFactory.getLogger(FrontendServer.class);

    // O navegador só carrega ES Modules se o .js vier com um tipo MIME de JavaScript.
    private static final Map<String, String> TIPOS = Map.ofEntries(
            Map.entry("html", "text/html; charset=utf-8"),
            Map.entry("css", "text/css; charset=utf-8"),
            Map.entry("js", "text/javascript; charset=utf-8"),
            Map.entry("json", "application/json; charset=utf-8"),
            Map.entry("svg", "image/svg+xml"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("ico", "image/x-icon"),
            Map.entry("woff2", "font/woff2"));

    private final boolean habilitado;
    private final int porta;
    private final Path pasta;
    private HttpServer servidor;

    @Autowired
    public FrontendServer(@Value("${sislab.frontend.habilitado}") boolean habilitado,
                          @Value("${sislab.frontend.porta}") int porta,
                          @Value("${sislab.frontend.pasta}") String pasta) {
        this(habilitado, porta, Path.of(pasta));
    }

    FrontendServer(boolean habilitado, int porta, Path pasta) {
        this.habilitado = habilitado;
        this.porta = porta;
        this.pasta = pasta.toAbsolutePath().normalize();
    }

    @PostConstruct
    void iniciar() {
        if (!habilitado) {
            return;
        }
        if (!Files.isDirectory(pasta)) {
            log.warn("Pasta do front-end não encontrada: {}. Inicie o backend a partir da raiz do projeto.", pasta);
            return;
        }
        try {
            servidor = HttpServer.create(new InetSocketAddress(porta), 0);
            servidor.createContext("/", this::atender);
            servidor.start();
            log.info("Front-end disponível em http://localhost:{}", portaEmUso());
        } catch (IOException e) {
            // Não derruba a API se a porta do front estiver ocupada
            log.warn("Não foi possível iniciar o front-end na porta {}: {}", porta, e.getMessage());
        }
    }

    @PreDestroy
    void parar() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    int portaEmUso() {
        return servidor.getAddress().getPort();
    }

    private void atender(HttpExchange ex) throws IOException {
        try (ex) {
            String metodo = ex.getRequestMethod();
            if (!metodo.equals("GET") && !metodo.equals("HEAD")) {
                ex.sendResponseHeaders(405, -1);
                return;
            }
            String caminho = ex.getRequestURI().getPath();
            if (caminho.equals("/")) {
                caminho = "/index.html";
            }
            Path arquivo;
            try {
                arquivo = pasta.resolve(caminho.substring(1)).normalize();
            } catch (InvalidPathException e) {
                ex.sendResponseHeaders(404, -1);
                return;
            }
            // Impede sair da pasta do front-end (ex.: /../pom.xml)
            if (!arquivo.startsWith(pasta) || !Files.isRegularFile(arquivo)) {
                ex.sendResponseHeaders(404, -1);
                return;
            }
            byte[] conteudo = Files.readAllBytes(arquivo);
            ex.getResponseHeaders().set("Content-Type", tipo(arquivo));
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
            if (metodo.equals("HEAD")) {
                ex.sendResponseHeaders(200, -1);
                return;
            }
            ex.sendResponseHeaders(200, conteudo.length);
            ex.getResponseBody().write(conteudo);
        }
    }

    private static String tipo(Path arquivo) {
        String nome = arquivo.getFileName().toString();
        String extensao = nome.contains(".") ? nome.substring(nome.lastIndexOf('.') + 1).toLowerCase() : "";
        return TIPOS.getOrDefault(extensao, "application/octet-stream");
    }
}
