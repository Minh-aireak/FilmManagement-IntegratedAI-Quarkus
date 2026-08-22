package org.film.management.config;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AIConfig {
    
    @ConfigProperty(name = "ai.provider", defaultValue = "openrouter")
    private String provider;
    
    @ConfigProperty(name = "openrouter.api-key")
    private String apiKey;
    
    @ConfigProperty(name = "openrouter.base-url", defaultValue = "https://openrouter.ai/api/v1")
    private String baseUrl;
    
    @ConfigProperty(name = "openrouter.model", defaultValue = "dots-studio/dots-3-note-preview:free")
    private String model;

    @ConfigProperty(name = "openrouter.fallback-model", defaultValue = "nvidia/nemotron-nano-9b-v2:free")
    private String fallbackModel;

    @ConfigProperty(name = "ai.cache-enabled", defaultValue = "true")
    private Boolean cacheEnabled;

    @ConfigProperty(name = "ai.cache-ttl-minutes", defaultValue = "60")
    private Integer cacheTtlMinutes;

    @ConfigProperty(name = "ai.temperature", defaultValue = "0.3")
    private Double temperature;
    
    @ConfigProperty(name = "ai.max-tokens", defaultValue = "1000")
    private Integer maxTokens;
    
    @ConfigProperty(name = "ai.timeout", defaultValue = "30")
    private Integer timeout;

    public String getProvider() {
        return provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getModel() {
        return model;
    }

    public String getFallbackModel() {
        return fallbackModel;
    }

    public boolean isCacheEnabled() {
        return Boolean.TRUE.equals(cacheEnabled);
    }

    public int getCacheTtlMinutes() {
        return cacheTtlMinutes;
    }

    public Double getTemperature() {
        return temperature;
    }

    public Integer getMaxTokens() {
        return maxTokens;
    }

    public Integer getTimeout() {
        return timeout;
    }
}
