package org.film.management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Strongly typed request object for searching movies.
 * All fields are optional - the LLM populates only what the user specifies.
 * The backend NEVER interprets natural language; it only executes business logic
 * using the structured parameters provided by the LLM.
 *
 * Based on actual Movie entity fields: idMovie, nameMovie, author, actors,
 * duration, language, description, image, createdAt, categories.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovieSearchRequest {

    /** Free-text keyword search. Matches against movie name, description, and actors (e.g. "batman", "avengers", "tom cruise") */
    private String keyword;

    /** Genre/category ID. Must be one of: ACTION, ADVENTURE, ANIMATION, COMEDY, DOCUMENTARY, DRAMA, FANTASY, HISTORICAL, HORROR, MYSTERY, ROMANCE, SCI_FI, THRILLER */
    private String genre;

    /** Language name (e.g. "English", "Korean", "Vietnamese"). Note: most movies in the database are "English" */
    private String language;

    /** Director/author name (e.g. "Christopher Nolan", "James Cameron") */
    private String author;

    /** Actor name to search for (e.g. "Tom Cruise", "Leonardo DiCaprio") */
    private String actorName;

    /** Page number for pagination (0-based) */
    @Builder.Default
    private Integer page = 0;

    /** Number of results per page. Default: 10. Max: 50. */
    @Builder.Default
    private Integer limit = 10;

    /** Field to sort by. Supported values: "createdAt" (release date), "nameMovie" (name), "duration" (runtime). Default: "createdAt" */
    private String sortBy;

    /** Sort direction: "asc" or "desc". Default: "desc" */
    @Builder.Default
    private String sortDirection = "desc";

    /** Date to find movies showing on (format: yyyy-MM-dd). Uses showtime data to determine which movies are playing. */
    private String showingDate;

    /** Earliest showtime on showingDate, inclusive, in HH:mm format. */
    private String startTime;

    /** Latest showtime on showingDate, inclusive, in HH:mm format. */
    private String endTime;

    /** Month used to rank hot movies by sold-ticket count (1-12). */
    private Integer popularityMonth;

    /** Year used together with popularityMonth. */
    private Integer popularityYear;

    /**
     * Clear out the placeholders language models emit for "no value".
     * <p>
     * Models routinely fill unused optional parameters with the literal strings
     * {@code "None"}, {@code "null"}, {@code "N/A"} or {@code ""} instead of omitting them.
     * Left alone those reach the filters as real values - {@code showingDate="None"} became
     * {@code LocalDate.parse("None")} in movie-service and failed the whole request.
     * </p>
     */
    public MovieSearchRequest sanitized() {
        keyword = blankToNull(keyword);
        genre = blankToNull(genre);
        language = blankToNull(language);
        author = blankToNull(author);
        actorName = blankToNull(actorName);
        sortBy = blankToNull(sortBy);
        sortDirection = blankToNull(sortDirection);
        showingDate = blankToNull(showingDate);
        startTime = blankToNull(startTime);
        endTime = blankToNull(endTime);
        return this;
    }

    static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()
                || trimmed.equalsIgnoreCase("none")
                || trimmed.equalsIgnoreCase("null")
                || trimmed.equalsIgnoreCase("nil")
                || trimmed.equalsIgnoreCase("undefined")
                || trimmed.equalsIgnoreCase("n/a")
                || trimmed.equalsIgnoreCase("string")) {
            return null;
        }
        return trimmed;
    }
}
