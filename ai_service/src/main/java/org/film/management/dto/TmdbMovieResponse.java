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
public class TmdbMovieResponse {
    
    private int id;
    private String title;
    private String overview;
    private String release_date;
    private double vote_average;
    private int vote_count;
    private String poster_path;
    private String backdrop_path;
    private int runtime;
    private List<TmdbGenre> genres;
    private String status;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TmdbGenre {
        private int id;
        private String name;
    }
}
