package org.film.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieServiceMovieResponse {
    
    private String idMovie;
    private String nameMovie;
    private String author;
    private String actors;
    private String duration;
    private String language;
    private String description;
    private String image;
    private LocalDateTime createdAt;
    private List<CategoryResponse> categories;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryResponse {
        private String idCategory;
    }
}
