package org.film.management.ai.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.film.management.dto.TmdbSearchResponse;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Opt-in smoke test for the real external movie database.
 * It is skipped during normal builds so CI never depends on network access or a secret.
 */
class TmdbLiveApiTest {

    @Test
    void realTmdbSearchReturnsJoker() throws Exception {
        assumeTrue(Boolean.getBoolean("tmdb.live-tests"),
                "Run with -Dtmdb.live-tests=true when a live TMDB check is desired");
        String apiKey = System.getenv("TMDB_API_KEY");
        assumeTrue(apiKey != null && !apiKey.isBlank(), "TMDB_API_KEY is required");

        String query = URLEncoder.encode("Joker", StandardCharsets.UTF_8);
        URI uri = URI.create("https://api.themoviedb.org/3/search/movie"
                + "?api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                + "&query=" + query + "&language=vi-VN&page=1");
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(20))
                .GET()
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        assertEquals(200, response.statusCode(), "TMDB phải trả HTTP 200");
        TmdbSearchResponse result = new ObjectMapper().readValue(response.body(), TmdbSearchResponse.class);
        assertFalse(result.getResults().isEmpty(), "TMDB phải trả ít nhất một kết quả cho Joker");
    }
}
