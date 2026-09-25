package com.example.vivuapp.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Dedicated HTTP client configuration for the internal Python AI service.
 * The existing RestTemplate used by GoogleMapsService remains unchanged.
 */
@Configuration
public class PythonAiClientConfig {

    @Bean("pythonAiRestTemplate")
    public RestTemplate pythonAiRestTemplate(
            RestTemplateBuilder builder,
            @Value("${ai.python.connect-timeout-ms:3000}") long connectTimeoutMs,
            @Value("${ai.python.read-timeout-ms:35000}") long readTimeoutMs) {

        return builder
                .setConnectTimeout(Duration.ofMillis(connectTimeoutMs))
                .setReadTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
    }

    @Bean("pythonAiRestClient")
    public RestClient pythonAiRestClient(
            @Qualifier("pythonAiRestTemplate") RestTemplate pythonAiRestTemplate) {
        return RestClient.create(pythonAiRestTemplate);
    }
}
