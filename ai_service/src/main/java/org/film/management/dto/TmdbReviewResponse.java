package org.film.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
        private String author_details;
        private String content;
        private String created_at;
        private String id;
        private String updated_at;
        private String url;
    }
}
