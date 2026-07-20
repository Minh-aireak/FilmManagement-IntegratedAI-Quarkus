package org.film.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Strongly typed request object for fetching movie reviews.
 * The LLM populates the fields based on natural language understanding.
 * The backend NEVER interprets user text; it only executes the request.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieReviewRequest {

    /** The title of the movie to get reviews for (e.g. "Inception", "The Dark Knight") */
    private String movieTitle;

    /** The year of release to disambiguate movies with the same title (optional) */
    private Integer releaseYear;

    /** Language for reviews (e.g. "en-US", "vi-VN") */
    @Builder.Default
    private String language = "en-US";

    /** Maximum number of reviews to return */
    @Builder.Default
    private Integer maxReviews = 5;
}