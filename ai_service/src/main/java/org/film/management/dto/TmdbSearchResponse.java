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
public class TmdbSearchResponse {
    
    private int page;
    private List<TmdbMovieResult> results;
    private int total_pages;
    private int total_results;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TmdbMovieResult {
        private int id;
        private String title;
        private String overview;
        private String release_date;
        private double vote_average;
        private int vote_count;
        private String poster_path;
        private List<TmdbGenre> genres;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TmdbGenre {
        private int id;
        private String name;
    }
}
