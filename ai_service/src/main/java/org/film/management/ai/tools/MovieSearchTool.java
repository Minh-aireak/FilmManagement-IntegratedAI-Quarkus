package org.film.management.ai.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.film.management.client.MovieServiceClient;
import org.film.management.client.MovieStatsClient;
import org.film.management.dto.MovieDto;
import org.film.management.dto.MovieSearchRequest;
import org.film.management.dto.MovieServiceMovieResponse;
import org.film.management.dto.MovieServiceResponse;
import org.film.management.dto.MovieStatsResponse;
import org.film.management.exception.AIServiceException;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@ApplicationScoped
public class MovieSearchTool {

    private static final Logger LOG = Logger.getLogger(MovieSearchTool.class);

    private static final int MAX_MOVIES_FOR_AI = 10;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Inject
    @RestClient
    MovieServiceClient movieServiceClient;

    @Inject
    @RestClient
    MovieStatsClient movieStatsClient;

    /**
     * Search for movies from the internal database based on structured filter criteria.
     * <p>
     * This tool accepts a strongly-typed MovieSearchRequest object. The LLM is responsible
     * for populating the fields based on the user's natural language request.
     * The backend ONLY applies the filters and returns matching movies.
     * </p>
     * <p>
     * Available fields in the database:
     * <ul>
     *   <li><b>nameMovie</b> - Movie title (e.g. "Inception", "The Dark Knight")</li>
     *   <li><b>author</b> - Director name (e.g. "Christopher Nolan")</li>
     *   <li><b>actors</b> - Actor names as text (e.g. "Tom Cruise, Miles Teller")</li>
     *   <li><b>duration</b> - Runtime in minutes (e.g. "148")</li>
     *   <li><b>language</b> - Language (e.g. "English", "Korean")</li>
     *   <li><b>description</b> - Plot summary</li>
     *   <li><b>createdAt</b> - Release/added date</li>
     *   <li><b>categories</b> - Genre list (ACTION, COMEDY, HORROR, SCI_FI, DRAMA, etc.)</li>
     * </ul>
     * NOTE: The database does NOT have rating, review score, or releaseYear fields.
     * </p>
     * <p>
     * Field details for MovieSearchRequest:
     * <ul>
     *   <li><b>keyword</b> (optional): Free-text to match against movie name, description, or actors. E.g. "batman", "tom cruise", "avengers".</li>
     *   <li><b>genre</b> (optional): Genre/category ID. Must be one of: ACTION, ADVENTURE, ANIMATION, COMEDY, DOCUMENTARY, DRAMA, FANTASY, HISTORICAL, HORROR, MYSTERY, ROMANCE, SCI_FI, THRILLER.</li>
     *   <li><b>language</b> (optional): Language name. E.g. "English", "Korean", "Vietnamese". Most movies are "English".</li>
     *   <li><b>author</b> (optional): Director/author name. E.g. "Christopher Nolan", "James Cameron".</li>
     *   <li><b>actorName</b> (optional): Actor name to search for. E.g. "Tom Cruise", "Leonardo DiCaprio".</li>
     *   <li><b>page</b> (optional): Page number (0-based). Default: 0.</li>
     *   <li><b>limit</b> (optional): Results per page. Default: 10. Max: 50.</li>
     *   <li><b>sortBy</b> (optional): Sort field. Supported: "createdAt" (newest/oldest), "nameMovie" (alphabetical), "duration" (runtime). Default: "createdAt".</li>
     *   <li><b>sortDirection</b> (optional): "asc" or "desc". Default: "desc".</li>
     *   <li><b>showingDate</b> (optional): Date to find movies currently showing on (format: yyyy-MM-dd, e.g. "2026-07-20"). Uses showtime data.</li>
     * </ul>
     * </p>
     * <p>
     * <b>Examples:</b><br>
     * - "Find action movies" → genre="ACTION"<br>
     * - "Phim mới nhất" → sortBy="createdAt", sortDirection="desc"<br>
     * - "5 phim hành động" → genre="ACTION", limit=5<br>
     * - "Phim kinh dị" → genre="HORROR"<br>
     * - "Phim của Christopher Nolan" → author="Christopher Nolan"<br>
     * - "Phim có Tom Cruise" → actorName="Tom Cruise"<br>
     * - "Phim đang chiếu hôm nay" → showingDate="2026-07-20"<br>
     * - "Phim tiếng Hàn" → language="Korean"<br>
     * - "Phim có Batman" → keyword="Batman"<br>
     * - "Phim cũ nhất" → sortBy="createdAt", sortDirection="asc"<br>
     * - "Phim dài nhất" → sortBy="duration", sortDirection="desc"<br>
     * </p>
     */
    @Tool("Search for movies from the internal database. Call this whenever the user wants to find, list, search, or discover movies. Returns movie details including name, description, duration, language, actors, director, and categories. The database has movies like Inception, The Dark Knight, Avengers, etc. but does NOT have ratings or review scores.")
    public List<MovieDto> searchMovies(MovieSearchRequest request) {
        try {
            LOG.infof("Searching movies with request: %s", request);

            List<MovieServiceMovieResponse> movies;

            boolean hasClientFilter = (request.getKeyword() != null && !request.getKeyword().isBlank()) ||
                                      (request.getLanguage() != null && !request.getLanguage().isBlank()) ||
                                      (request.getAuthor() != null && !request.getAuthor().isBlank()) ||
                                      (request.getActorName() != null && !request.getActorName().isBlank());

            int fetchPage = (request.getPage() != null && !hasClientFilter) ? request.getPage() : 0;
            int fetchSize = 10;
            if (hasClientFilter) {
                // Fetch a large page size to ensure we search through all movies in DB
                fetchSize = 1000;
            } else if (request.getLimit() != null) {
                fetchSize = Math.min(request.getLimit(), 50);
            }

            boolean popularityRequested = request.getPopularityMonth() != null
                    || request.getPopularityYear() != null;

            if (popularityRequested) {
                LocalDate today = LocalDate.now();
                int month = request.getPopularityMonth() != null
                        ? request.getPopularityMonth()
                        : today.getMonthValue();
                int year = request.getPopularityYear() != null
                        ? request.getPopularityYear()
                        : today.getYear();
                LOG.infof("Fetching top movies for month %d/%d", month, year);
                movies = extractTopMovies(movieStatsClient.getDashboardStats(month, year));
            } else if (request.getShowingDate() != null && !request.getShowingDate().isBlank()) {
                LOG.infof("Fetching movies by showing date: %s", request.getShowingDate());
                MovieServiceResponse response = movieServiceClient.getMoviesByDate(
                        request.getShowingDate(),
                        fetchPage,
                        fetchSize,
                        request.getStartTime(),
                        request.getEndTime()
                );
                movies = extractMovies(response);
            } else {
                // Fetch from movie service
                MovieServiceResponse response = movieServiceClient.getMovies(
                        fetchPage,
                        fetchSize,
                        request.getGenre()
                );
                movies = extractMovies(response);
            }

            LOG.infof("Movie service returned %d movies before filtering", movies.size());

            // Apply client-side filters that the movie-service may not support natively
            Stream<MovieServiceMovieResponse> filteredStream = movies.stream();

            // Keyword filter (match against name, description, actors)
            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String keyword = request.getKeyword().toLowerCase().trim();
                filteredStream = filteredStream.filter(m ->
                        (m.getNameMovie() != null && m.getNameMovie().toLowerCase().contains(keyword)) ||
                        (m.getDescription() != null && m.getDescription().toLowerCase().contains(keyword)) ||
                        (m.getActors() != null && m.getActors().toLowerCase().contains(keyword))
                );
            }

            // Language filter
            if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
                String lang = request.getLanguage().toLowerCase().trim();
                filteredStream = filteredStream.filter(m ->
                        m.getLanguage() != null && m.getLanguage().toLowerCase().contains(lang)
                );
            }

            // Author/director filter
            if (request.getAuthor() != null && !request.getAuthor().isBlank()) {
                String author = request.getAuthor().toLowerCase().trim();
                filteredStream = filteredStream.filter(m ->
                        m.getAuthor() != null && m.getAuthor().toLowerCase().contains(author)
                );
            }

            // Actor name filter
            if (request.getActorName() != null && !request.getActorName().isBlank()) {
                String actor = request.getActorName().toLowerCase().trim();
                filteredStream = filteredStream.filter(m ->
                        m.getActors() != null && m.getActors().toLowerCase().contains(actor)
                );
            }

            movies = filteredStream.collect(Collectors.toList());

            // Sort results
            if (!popularityRequested && request.getSortBy() != null && !request.getSortBy().isBlank()) {
                boolean asc = "asc".equalsIgnoreCase(request.getSortDirection());
                switch (request.getSortBy().toLowerCase()) {
                    case "duration":
                        movies.sort((a, b) -> {
                            int da = a.getDuration() != null ? parseDurationMinutes(a.getDuration()) : 0;
                            int db = b.getDuration() != null ? parseDurationMinutes(b.getDuration()) : 0;
                            return asc ? Integer.compare(da, db) : Integer.compare(db, da);
                        });
                        break;
                    case "name":
                    case "namemovie":
                    case "nameMovie":
                        movies.sort((a, b) -> asc
                                ? Objects.compare(a.getNameMovie(), b.getNameMovie(), String::compareToIgnoreCase)
                                : Objects.compare(b.getNameMovie(), a.getNameMovie(), String::compareToIgnoreCase));
                        break;
                    case "createdat":
                    case "createdAt":
                    case "release":
                    case "newest":
                    default:
                        // Default sorting - already sorted by createdAt desc from service
                        // If asc, reverse the list
                        if (asc) {
                            Collections.reverse(movies);
                        }
                        break;
                }
            }

            // Pagination limit in memory
            int limit = request.getLimit() != null ? Math.min(request.getLimit(), 50) : 10;
            if (popularityRequested) {
                limit = Math.min(limit, 5);
            }
            int pageOffset = hasClientFilter && !popularityRequested
                    ? (request.getPage() != null ? request.getPage() * limit : 0)
                    : 0;

            List<MovieDto> optimizedMovies = movies.stream()
                    .skip(pageOffset)
                    .limit(limit)
                    .map(this::mapToMovieDto)
                    .collect(Collectors.toList());

            try {
                String jsonPreview = MAPPER.writeValueAsString(optimizedMovies);
                LOG.infof("Tool result: %d movies, %d bytes",
                        optimizedMovies.size(), jsonPreview.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
            } catch (Exception ignored) {
            }

            return optimizedMovies;

        } catch (Exception e) {
            LOG.errorf("Movie service invocation failed: %s", e.getMessage());
            throw new AIServiceException("Movie service invocation failed: " + e.getMessage(), e);
        }
    }

    private List<MovieServiceMovieResponse> extractMovies(MovieServiceResponse response) {
        if (response != null && response.getResult() != null && response.getResult().getData() != null) {
            return response.getResult().getData();
        }
        return Collections.emptyList();
    }

    private List<MovieServiceMovieResponse> extractTopMovies(MovieStatsResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getTopMovies() == null) {
            return Collections.emptyList();
        }

        return response.getResult().getTopMovies().stream()
                .map(movie -> MovieServiceMovieResponse.builder()
                        .idMovie(movie.getIdMovie())
                        .nameMovie(movie.getMovieName())
                        .image(movie.getImage())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Parse duration string like "120" or "120 min" or "1h 30m" into minutes.
     */
    private int parseDurationMinutes(String duration) {
        try {
            String trimmed = duration.trim().toLowerCase();
            if (trimmed.contains("min")) {
                return Integer.parseInt(trimmed.replaceAll("[^0-9]", ""));
            }
            if (trimmed.contains("h")) {
                int hours = 0;
                int minutes = 0;
                String[] parts = trimmed.split("h|h ");
                if (parts.length > 0) {
                    hours = Integer.parseInt(parts[0].trim());
                }
                if (parts.length > 1) {
                    minutes = Integer.parseInt(parts[1].replaceAll("[^0-9]", "").trim());
                }
                return hours * 60 + minutes;
            }
            return Integer.parseInt(trimmed.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private MovieDto mapToMovieDto(MovieServiceMovieResponse response) {
        List<String> categories = response.getCategories() != null
                ? response.getCategories().stream()
                        .map(cat -> cat.getIdCategory())
                        .collect(Collectors.toList())
                : List.of();

        return MovieDto.builder()
                .idMovie(response.getIdMovie())
                .nameMovie(response.getNameMovie())
                .author(response.getAuthor())
                .duration(response.getDuration())
                .language(response.getLanguage())
                .actors(response.getActors())
                .description(response.getDescription())
                .image(response.getImage())
                .categories(categories)
                .build();
    }
}
