package org.film.management.ai.tools;

import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.film.management.client.TmdbClient;
import org.film.management.dto.MovieReviewRequest;
import org.film.management.dto.ReviewDto;
import org.film.management.dto.TmdbMovieResponse;
import org.film.management.dto.TmdbReviewResponse;
import org.film.management.dto.TmdbSearchResponse;
import org.film.management.exception.AIServiceException;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@ApplicationScoped
public class MovieReviewTool {

    private static final Logger LOG = Logger.getLogger(MovieReviewTool.class);

    @Inject
    @RestClient
    TmdbClient tmdbClient;

    @ConfigProperty(name = "tmdb.api-key")
    String tmdbApiKey;

    @ConfigProperty(name = "tmdb.language")
    String tmdbLanguage;

    /**
     * Get movie reviews and ratings from the external TMDB API.
     * <p>
     * This tool accepts a strongly-typed MovieReviewRequest object. The LLM is responsible
     * for populating the fields based on the user's natural language request.
     * The backend ONLY fetches the data and returns structured review information.
     * </p>
     * <p>
     * Field details:
     * <ul>
     *   <li><b>movieTitle</b> (required): The exact or approximate title of the movie to search for (e.g. "Inception", "The Dark Knight").</li>
     *   <li><b>releaseYear</b> (optional): The year of release to disambiguate movies with the same title (e.g. 2024).</li>
     *   <li><b>language</b> (optional): Language for reviews and details (e.g. "en-US", "vi-VN"). Default: "en-US".</li>
     *   <li><b>maxReviews</b> (optional): Maximum number of review excerpts to return. Default: 5.</li>
     * </ul>
     * </p>
     * <p>
     * <b>Examples:</b><br>
     * - "What are the reviews for Inception?" → movieTitle="Inception"<br>
     * - "Show me ratings for The Dark Knight" → movieTitle="The Dark Knight"<br>
     * - "Đánh giá phim Doraemon" → movieTitle="Doraemon", language="vi-VN"<br>
     * </p>
     */
    @Tool("Get movie reviews and ratings from the external TMDB API. Call this when the user asks about movie reviews, ratings, audience opinions, or critic feedback for a specific movie. Returns rating, overview, genres, review excerpts, and sentiment analysis.")
    public ReviewDto getMovieReviews(MovieReviewRequest request) {
        try {
            LOG.infof("Getting reviews for movie: %s (year: %s, lang: %s, maxReviews: %d)",
                    request.getMovieTitle(), request.getReleaseYear(), request.getLanguage(), request.getMaxReviews());

            String language = request.getLanguage() != null ? request.getLanguage() : tmdbLanguage;

            // First search for the movie to get its ID
            TmdbSearchResponse searchResponse = tmdbClient.searchMovie(
                    tmdbApiKey,
                    request.getMovieTitle(),
                    language,
                    1
            );

            if (searchResponse.getResults() == null || searchResponse.getResults().isEmpty()) {
                throw new AIServiceException("Movie not found: " + request.getMovieTitle());
            }

            // Get the first matching movie
            TmdbSearchResponse.TmdbMovieResult movieResult = searchResponse.getResults().get(0);
            String movieId = String.valueOf(movieResult.getId());

            // Get detailed movie information and reviews in parallel to optimize latency
            CompletableFuture<TmdbMovieResponse> detailsFuture = CompletableFuture.supplyAsync(() ->
                    tmdbClient.getMovieDetails(movieId, tmdbApiKey, language)
            );

            CompletableFuture<TmdbReviewResponse> reviewsFuture = CompletableFuture.supplyAsync(() ->
                    tmdbClient.getMovieReviews(movieId, tmdbApiKey, language, 1)
            );

            // Wait for both to complete
            CompletableFuture.allOf(detailsFuture, reviewsFuture).join();

            TmdbMovieResponse movieDetails = detailsFuture.get();
            TmdbReviewResponse reviewResponse = reviewsFuture.get();

            // Map genres
            List<String> genres = movieDetails.getGenres() != null
                    ? movieDetails.getGenres().stream()
                            .map(TmdbMovieResponse.TmdbGenre::getName)
                            .collect(Collectors.toList())
                    : List.of();

            // Map reviews
            int maxReviews = request.getMaxReviews() != null ? request.getMaxReviews() : 5;
            List<String> reviews = reviewResponse.getResults() != null
                    ? reviewResponse.getResults().stream()
                            .limit(maxReviews)
                            .map(review -> review.getAuthor() + ": " + review.getContent())
                            .collect(Collectors.toList())
                    : List.of();

            // Calculate sentiment based on rating
            String sentiment = calculateSentiment(movieDetails.getVote_average());

            // Generate popular opinion
            String popularOpinion = generatePopularOpinion(movieDetails, reviews);

            return ReviewDto.builder()
                    .movieTitle(movieDetails.getTitle())
                    .rating(movieDetails.getVote_average())
                    .overview(movieDetails.getOverview())
                    .releaseDate(movieDetails.getRelease_date())
                    .genres(genres)
                    .reviews(reviews)
                    .sentiment(sentiment)
                    .popularOpinion(popularOpinion)
                    .build();

        } catch (Exception e) {
            LOG.errorf("Error getting movie reviews: %s", e.getMessage());
            throw new AIServiceException("Failed to get movie reviews: " + e.getMessage(), e);
        }
    }

    private String calculateSentiment(double rating) {
        if (rating >= 7.0) {
            return "Positive";
        } else if (rating >= 5.0) {
            return "Mixed";
        } else {
            return "Negative";
        }
    }

    private String generatePopularOpinion(TmdbMovieResponse movieDetails, List<String> reviews) {
        if (reviews.isEmpty()) {
            return "No reviews available";
        }

        String sentiment = calculateSentiment(movieDetails.getVote_average());
        return String.format("Based on %d reviews, this movie has a %s rating of %.1f/10. %s audience sentiment.",
                reviews.size(),
                sentiment.toLowerCase(),
                movieDetails.getVote_average(),
                sentiment);
    }
}