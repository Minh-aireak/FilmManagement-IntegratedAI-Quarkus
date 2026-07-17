package org.film.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private int totalMovies;
    private int totalTickets;
    private int totalRevenue;
    private List<MovieStat> topMovies;
    private List<TimeSlotStat> topTimeSlots;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class MovieStat {
        private String movieName;
        private String image;
        private long ticketCount;
        private String idMovie;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class TimeSlotStat {
        private String label;
        private long count;
    }
}
