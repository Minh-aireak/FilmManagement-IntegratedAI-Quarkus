package org.film.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Structured booking intent produced by the language model.
 * The AI service only extracts these constraints; the authenticated frontend
 * resolves live showtimes/seats and asks the customer to confirm before booking.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingIntentRequest {

    private String movieTitle;
    private String showingDate;
    private String startTime;
    private String endTime;

    @Builder.Default
    private Integer seatCount = 1;

    /** Comma-separated business seat types in priority order. */
    @Builder.Default
    private String seatPriority = "VIP,STANDARD,COUPLE";

    @Builder.Default
    private Boolean preferCenter = true;

    public BookingIntentRequest sanitized() {
        movieTitle = MovieSearchRequest.blankToNull(movieTitle);
        showingDate = MovieSearchRequest.blankToNull(showingDate);
        startTime = MovieSearchRequest.blankToNull(startTime);
        endTime = MovieSearchRequest.blankToNull(endTime);
        seatPriority = MovieSearchRequest.blankToNull(seatPriority);

        if (showingDate == null) {
            showingDate = LocalDate.now().toString();
        }
        if (seatCount == null || seatCount < 1) {
            seatCount = 1;
        } else if (seatCount > 8) {
            seatCount = 8;
        }
        if (seatPriority == null) {
            seatPriority = "VIP,STANDARD,COUPLE";
        }
        // The current database calls its multi-person seat COUPLE. Treat the
        // user's common "triple" wording as that available fallback type.
        seatPriority = seatPriority.toUpperCase().replace("TRIPLE", "COUPLE");
        if (preferCenter == null) {
            preferCenter = true;
        }
        return this;
    }
}
