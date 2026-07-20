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

    /** Date to find movies showing on (format: yyyy-MM-dd, e.g. "2026-07-20"). Uses showtime data to determine which movies are playing. */
    private String showingDate;
}