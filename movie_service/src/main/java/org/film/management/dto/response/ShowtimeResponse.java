package org.film.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeResponse {
    private String idShowtime;
    private LocalDateTime showTime;
    private String idMovie;
    private String idRoom;
    private String movieName;
    private String movieImage;
}
