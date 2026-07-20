package org.film.management.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    private String conversationId;

    @NotBlank(message = "Message cannot be blank")
    private String message;

    private ChatContext context;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatContext {
        private String userId;
        private String currentPage;
        private String movieId;
        private String showtimeId;
        private Map<String, String> metadata;
    }
}
