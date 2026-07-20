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
public class ChatResponse {

    private String conversationId;
    private String answer;
    private String timestamp;

    /**
     * Response type: 
     * - "TEXT" for normal AI chat
     * - "MOVIE_LIST" for structured movie list response
     * - "MOVIE_REVIEW" for movie review response
     */
    private String type;

    /**
     * Structured data for MOVIE_LIST type.
     */
    private List<MovieSummaryDTO> data;

    private ReviewDto review;
}