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
public class ReviewDto {
    
    private String movieTitle;
    private Double rating;
    private String overview;
    private String releaseDate;
    private List<String> genres;
    private List<String> reviews;
    private String sentiment;
    private String popularOpinion;
}
