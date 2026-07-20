package org.film.management.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MovieDto {
    
    private String idMovie;
    private String nameMovie;
    private String author;
    private String actors;
    private String duration;
    private String language;
    private String description;
    private String image;
    private List<String> categories;
}