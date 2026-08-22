package org.film.management.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TmdbReviewResponse {
    
    private int page;
    private List<TmdbReview> results;
    private int total_pages;
    private int total_results;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TmdbReview {
        private String author;

        /** TMDB sends an object here, not a string - declaring it as String made Jackson
         *  throw MismatchedInputException and broke every review lookup. */
        private TmdbAuthorDetails author_details;

        private String content;
        private String created_at;
        private String id;
        private String updated_at;
        private String url;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TmdbAuthorDetails {
        private String name;
        private String username;
        private String avatar_path;
        /** Reviewer's own score out of 10; null when they left no score. */
        private Double rating;
    }
}
