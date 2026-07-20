package org.film.management.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MovieServiceResponse {

    private boolean success;
    private int code;
    private String message;
    private PageResult result;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PageResult {
        private int currentPage;
        private int totalPages;
        private int pageSize;
        private long totalElement;

        @Builder.Default
        private List<MovieServiceMovieResponse> data = Collections.emptyList();
    }
}