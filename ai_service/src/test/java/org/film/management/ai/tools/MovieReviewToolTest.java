package org.film.management.ai.tools;

import org.film.management.client.TmdbClient;
import org.film.management.dto.MovieReviewRequest;
import org.film.management.dto.ReviewDto;
import org.film.management.dto.TmdbMovieResponse;
import org.film.management.dto.TmdbReviewResponse;
import org.film.management.dto.TmdbSearchResponse;
import org.film.management.exception.AIServiceException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MovieReviewToolTest {

    @Test
    void reviewDataComesFromAllThreeTmdbEndpoints() {
        RecordingTmdbClient client = RecordingTmdbClient.withJokerData();
        MovieReviewTool tool = toolUsing(client);

        ReviewDto result = tool.getMovieReviews(MovieReviewRequest.builder()
                .movieTitle("Joker")
                .language("vi-VN")
                .maxReviews(1)
                .build());

        assertTrue(client.searchCalled.get(), "Phải gọi TMDB search/movie");
        assertTrue(client.detailsCalled.get(), "Phải gọi TMDB movie/{id}");
        assertTrue(client.reviewsCalled.get(), "Phải gọi TMDB movie/{id}/reviews");
        assertEquals("TMDB", result.getSource());
        assertEquals("Joker (TMDB fixture)", result.getMovieTitle());
        assertEquals(8.4, result.getRating());
        assertEquals(List.of("Drama", "Thriller"), result.getGenres());
        assertEquals(1, result.getReviews().size());
        assertTrue(result.getReviews().get(0).contains("external review fixture"));
    }

    @Test
    void missingTmdbMovieDoesNotInventReviewData() {
        RecordingTmdbClient client = new RecordingTmdbClient();
        client.expectedQuery = "Phim không tồn tại";
        client.searchResponse = TmdbSearchResponse.builder().results(List.of()).build();
        MovieReviewTool tool = toolUsing(client);

        AIServiceException error = assertThrows(AIServiceException.class,
                () -> tool.getMovieReviews(MovieReviewRequest.builder()
                        .movieTitle("Phim không tồn tại")
                        .language("vi-VN")
                        .maxReviews(5)
                        .build()));

        assertTrue(error.getMessage().contains("Movie not found"));
        assertTrue(client.searchCalled.get());
        assertFalse(client.detailsCalled.get());
        assertFalse(client.reviewsCalled.get());
    }

    private static MovieReviewTool toolUsing(TmdbClient client) {
        MovieReviewTool tool = new MovieReviewTool();
        tool.tmdbClient = client;
        tool.tmdbApiKey = "test-key";
        tool.tmdbLanguage = "vi-VN";
        return tool;
    }

    private static final class RecordingTmdbClient implements TmdbClient {
        private final AtomicBoolean searchCalled = new AtomicBoolean();
        private final AtomicBoolean detailsCalled = new AtomicBoolean();
        private final AtomicBoolean reviewsCalled = new AtomicBoolean();
        private TmdbSearchResponse searchResponse;
        private TmdbMovieResponse movieResponse;
        private TmdbReviewResponse reviewResponse;
        private String expectedQuery = "Joker";

        private static RecordingTmdbClient withJokerData() {
            RecordingTmdbClient client = new RecordingTmdbClient();
            client.searchResponse = TmdbSearchResponse.builder()
                    .results(List.of(TmdbSearchResponse.TmdbMovieResult.builder()
                            .id(475557)
                            .title("Joker")
                            .build()))
                    .build();
            client.movieResponse = TmdbMovieResponse.builder()
                    .id(475557)
                    .title("Joker (TMDB fixture)")
                    .overview("Overview returned by the external movie database")
                    .release_date("2019-10-01")
                    .vote_average(8.4)
                    .genres(List.of(
                            TmdbMovieResponse.TmdbGenre.builder().name("Drama").build(),
                            TmdbMovieResponse.TmdbGenre.builder().name("Thriller").build()))
                    .build();
            client.reviewResponse = TmdbReviewResponse.builder()
                    .results(List.of(TmdbReviewResponse.TmdbReview.builder()
                            .author("TMDB reviewer")
                            .content("external review fixture")
                            .build()))
                    .build();
            return client;
        }

        @Override
        public TmdbSearchResponse searchMovie(String apiKey, String query, String language, int page) {
            searchCalled.set(true);
            assertEquals("test-key", apiKey);
            assertEquals(expectedQuery, query);
            assertEquals("vi-VN", language);
            return searchResponse;
        }

        @Override
        public TmdbMovieResponse getMovieDetails(String movieId, String apiKey, String language) {
            detailsCalled.set(true);
            assertEquals("475557", movieId);
            return movieResponse;
        }

        @Override
        public TmdbReviewResponse getMovieReviews(
                String movieId, String apiKey, String language, int page) {
            reviewsCalled.set(true);
            assertEquals("475557", movieId);
            return reviewResponse;
        }
    }
}
