package org.film.management.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddShowtimeRequest {
    public String idMovie;
    public String idRoom;
    public LocalDateTime showTime;

    public int standardPrice;
    public int vipPrice;
    public int couplePrice;
}
