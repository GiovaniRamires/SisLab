package br.com.cs.sislab.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS para o front-end (servido em outra origem, ex.: http://localhost:5500).
 *
 * Com Spring Security, habilite no SecurityFilterChain:
 *     http.cors(Customizer.withDefaults());
 * O Security reutiliza automaticamente estas regras do Spring MVC e libera o preflight (OPTIONS).
 *
 * allowCredentials(true) permite o envio do cookie de sessão (JSESSIONID / XSRF-TOKEN) e do
 * header Authorization. As origens são configuradas em sislab.cors.allowed-origins.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${sislab.cors.allowed-origins:http://localhost:5500,http://127.0.0.1:5500}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
