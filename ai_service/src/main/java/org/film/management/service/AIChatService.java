package org.film.management.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.ToolExecutionRequest;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.ToolExecutionResultMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.output.Response;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.film.management.ai.AIService;
import org.film.management.ai.tools.MovieReviewTool;
import org.film.management.ai.tools.MovieSearchTool;
import org.film.management.config.AIConfig;
import org.film.management.dto.BookingIntentRequest;
import org.film.management.dto.ChatRequest;
import org.film.management.dto.ChatResponse;
import org.film.management.dto.MovieDto;
import org.film.management.dto.MovieReviewRequest;
import org.film.management.dto.MovieSearchRequest;
import org.film.management.dto.MovieSummaryDTO;
import org.film.management.dto.ReviewDto;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * AI Chat Service that follows a strict LLM → Tool → Service → Repository architecture.
 * <p>
 * The backend NEVER parses natural language. The LLM is fully responsible for:
 * <ul>
 *   <li>Understanding user intent from natural language</li>
 *   <li>Choosing the appropriate tool to call</li>
 *   <li>Populating all tool parameters as structured request objects</li>
 *   <li>Generating natural language responses from tool results</li>
 * </ul>
 * </p>
 * <p>
 * For MOVIE_LIST requests (searchMovies tool), the backend returns structured data directly
 * so the frontend can render clickable movie links immediately without waiting for LLM text generation.
 * For other requests (getMovieReviews, general chat), the LLM generates the response text.
 * </p>
 */
@ApplicationScoped
public class AIChatService {

    private static final Logger LOG = Logger.getLogger(AIChatService.class);

    /**
     * Every iteration is one OpenRouter request. Answers that need more than three rounds
     * are almost always a model looping on a tool it cannot satisfy, and on the free tier
     * those wasted rounds come straight out of the daily allowance.
     */
    private static final int MAX_TOOL_ITERATIONS = 3;

    private static final int MEMORY_WINDOW = 10;

    private static final int MAX_CACHED_ANSWERS = 200;

    /** Longest plot summary handed back to the model; it never quotes more than a line of it. */
    private static final int DESCRIPTION_CHARS = 220;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<String, ChatMemory> memories = new ConcurrentHashMap<>();

    /**
     * Replay cache. The free tier allows only a few dozen model requests per day, and
     * rehearsing a demo means asking the same questions over and over - those repeats
     * should not cost anything. Keyed on the whole sequence of user turns, so replaying an
     * identical conversation hits the cache on every turn while a genuinely new follow-up
     * still goes to the model.
     */
    private final Map<String, CachedAnswer> answerCache = new ConcurrentHashMap<>();

    /** conversationId -&gt; the user turns seen so far, used to build the cache key. */
    private final Map<String, List<String>> transcripts = new ConcurrentHashMap<>();

    private record CachedAnswer(ChatResponse response, MovieSearchRequest searchRequest, long storedAtMillis) {
    }

    private record MovieListResult(ChatResponse response, MovieSearchRequest searchRequest) {
    }

    private record MovieDetailToolResult(String serializedResult, List<MovieSummaryDTO> summaries) {
    }

    private record MovieReviewToolResult(String serializedResult, ReviewDto review) {
    }

    /** Immutable and identical on every call, so it is built once instead of per iteration. */
    private List<dev.langchain4j.agent.tool.ToolSpecification> toolSpecifications;

    @Inject
    AIConfig aiConfig;

    @Inject
    MovieSearchTool movieSearchTool;

    @Inject
    MovieReviewTool movieReviewTool;

    private ChatLanguageModel chatModel;
    private ChatLanguageModel fallbackChatModel;

    @PostConstruct
    public void init() {
        LOG.infof("Initializing AI Chat Service with provider: %s, model: %s",
                aiConfig.getProvider(), aiConfig.getModel());

        this.chatModel = createChatModel(aiConfig.getModel());
        this.toolSpecifications = buildToolSpecifications();

        String fallback = aiConfig.getFallbackModel();
        if (fallback != null && !fallback.isBlank() && !fallback.equals(aiConfig.getModel())) {
            this.fallbackChatModel = createChatModel(fallback);
            LOG.infof("Fallback model configured: %s", fallback);
        }

        // No AiServices proxy: the tool loop in executeToolLoop drives chatModel.generate()
        // directly so it can short-circuit list queries, return booking intents without a
        // second model round, and fail over to fallbackChatModel. AIService is kept only as
        // the home of the @SystemMessage prompt (see getSystemPromptFromAnnotation).
        LOG.info("AI Chat Service initialized");
    }

    public ChatResponse chat(ChatRequest request) {
        try {
            LOG.infof("=== CHAT REQUEST ===");
            LOG.infof("User message: %s", request.getMessage());
            LOG.infof("Model: %s", aiConfig.getModel());

            return executeToolLoop(request);

        } catch (Exception e) {
            if (isDailyQuotaExhausted(e)) {
                // Never let this reach the user as a 500: on the free tier it is an expected
                // end-of-day condition, and a stack trace in the chat box during a demo is
                // far worse than a plain sentence explaining what happened.
                LOG.warn("OpenRouter free daily quota exhausted - answering with a notice");
                return ChatResponse.builder()
                        .conversationId(request.getConversationId())
                        .answer("Trợ lý AI đã dùng hết lượt hỏi miễn phí của hôm nay. "
                                + "Hạn mức được cấp lại lúc 07:00 sáng mai, bạn quay lại sau nhé. "
                                + "Trong lúc đó bạn vẫn xem phim và đặt vé bình thường được.")
                        .type("TEXT")
                        .timestamp(LocalDateTime.now().toString())
                        .build();
            }
            LOG.error("Error processing chat message: " + e.getMessage(), e);
            throw new org.film.management.exception.AIServiceException("Failed to process chat message: " + e.getMessage(), e);
        }
    }

    /**
     * OpenRouter caps free-model usage per account per day, not per model, so once this
     * trips no amount of switching models helps until the daily reset.
     */
    private static boolean isDailyQuotaExhausted(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            String message = cause.getMessage();
            if (message != null && message.contains("free-models-per-day")) {
                return true;
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        return false;
    }

    /**
     * Unified tool execution loop for all models.
     * <p>
     * This still does ZERO natural language parsing - the LLM decides which tool to call
     * and populates all parameters. The backend only executes the tool and returns results.
     * </p>
     * <p>
     * When searchMovies is called, the backend returns MOVIE_LIST structured data immediately
     * so the frontend can render clickable movie links without waiting for LLM text generation.
     * This is faster and provides a better UX than waiting for the LLM to generate a text table.
     * </p>
     */
    private ChatResponse executeToolLoop(ChatRequest request) {
        String conversationId = request.getConversationId();
        if (conversationId == null || conversationId.isBlank()) {
            conversationId = java.util.UUID.randomUUID().toString();
        }

        ChatMemory chatMemory = memories.computeIfAbsent(conversationId,
                id -> MessageWindowChatMemory.withMaxMessages(MEMORY_WINDOW));

        // The system prompt has to go in FIRST. MessageWindowChatMemory only shields a
        // SystemMessage from eviction while it sits at index 0, so adding it after the user
        // message would both send it out of order and let it be dropped once the window
        // fills up - the bot would silently lose its instructions mid-conversation.
        boolean hasSystemMessage = chatMemory.messages().stream().anyMatch(m -> m instanceof SystemMessage);
        if (!hasSystemMessage) {
            String systemPrompt = getSystemPromptFromAnnotation();
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                chatMemory.add(SystemMessage.from(systemPrompt + currentDateSection()));
            }
        }

        chatMemory.add(UserMessage.from(request.getMessage()));

        List<String> transcript = transcripts.computeIfAbsent(conversationId,
                id -> Collections.synchronizedList(new ArrayList<>()));
        transcript.add(request.getMessage());

        String cacheKey = cacheKey(transcript);
        ChatResponse cached = lookupCachedAnswer(cacheKey, conversationId);
        if (cached != null) {
            LOG.infof("Cache hit - answering without spending an OpenRouter request");
            chatMemory.add(AiMessage.from(cached.getAnswer() != null
                    ? cached.getAnswer()
                    : describeMovieList(cached)));
            return cached;
        }

        // Load the full conversation history (system prompt + history + current user message)
        List<ChatMessage> messages = new ArrayList<>(chatMemory.messages());
        List<MovieSummaryDTO> detailMovieLinks = null;
        ReviewDto externalMovieReview = null;

        // Execute tool loop
        for (int iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
            LOG.debugf("--- AI Iteration %d ---", iteration);

            // Call the model
            Response<AiMessage> response = generate(messages);
            AiMessage aiMessage = response.content();

            LOG.debugf("AI response - text: %s", aiMessage.text());
            if (aiMessage.toolExecutionRequests() != null) {
                LOG.debugf("AI tool requests count: %d", aiMessage.toolExecutionRequests().size());
            }

            // Check if we have tool calls to execute
            if (aiMessage.toolExecutionRequests() != null && !aiMessage.toolExecutionRequests().isEmpty()) {
                LOG.infof("Executing %d tool(s) at iteration %d",
                        aiMessage.toolExecutionRequests().size(), iteration);

                boolean hasPrepareBooking = aiMessage.toolExecutionRequests().stream()
                        .anyMatch(ter -> "prepareBooking".equals(ter.name()));

                if (hasPrepareBooking) {
                    ChatResponse bookingResponse = handleBookingRequest(
                            aiMessage.toolExecutionRequests(), conversationId);
                    chatMemory.add(AiMessage.from(bookingResponse.getAnswer()));
                    // Live showtimes and seats can change at any moment, so booking
                    // requests deliberately bypass the replay cache.
                    return bookingResponse;
                }

                // Check if this is a searchMovies request - return MOVIE_LIST immediately
                // This avoids waiting for the LLM to generate text, making the frontend render faster
                boolean hasSearchMovies = aiMessage.toolExecutionRequests().stream()
                        .anyMatch(ter -> "searchMovies".equals(ter.name()));

                if (hasSearchMovies) {
                    LOG.infof("Detected searchMovies tool call - checking if list or detail query");
                    MovieListResult movieListResult = handleMovieListResponse(aiMessage.toolExecutionRequests(), conversationId);
                    if (movieListResult != null) {
                        ChatResponse movieListResponse = movieListResult.response();
                        // List query - return MOVIE_LIST structured response immediately.
                        // Persist a plain-text stand-in rather than the tool-call message: we
                        // answer without completing the tool round trip, so storing aiMessage
                        // would leave tool_calls with no matching tool results in the history
                        // and the provider rejects the next request in this conversation.
                        chatMemory.add(AiMessage.from(describeMovieList(movieListResponse)));
                        return remember(cacheKey, movieListResponse, movieListResult.searchRequest());
                    }
                    // Detail query (specific movie name) - continue tool loop to let LLM generate text
                    LOG.infof("Detail query - continuing tool loop for LLM text generation");
                    messages.add(aiMessage);
                    chatMemory.add(aiMessage); // Persist AI request to memory
                    for (ToolExecutionRequest ter : aiMessage.toolExecutionRequests()) {
                        String toolResult;
                        if ("searchMovies".equals(ter.name())) {
                            MovieDetailToolResult detailResult = executeDetailMovieSearch(ter);
                            toolResult = detailResult.serializedResult();
                            if (!detailResult.summaries().isEmpty()) {
                                detailMovieLinks = detailResult.summaries();
                            }
                        } else if ("getMovieReviews".equals(ter.name())) {
                            MovieReviewToolResult reviewResult = executeMovieReview(ter);
                            toolResult = reviewResult.serializedResult();
                            externalMovieReview = reviewResult.review();
                        } else {
                            toolResult = executeToolByName(ter);
                        }
                        LOG.debugf("Tool %s executed", ter.name());
                        ToolExecutionResultMessage resultMessage = ToolExecutionResultMessage.from(ter, toolResult);
                        messages.add(resultMessage);
                        chatMemory.add(resultMessage); // Persist tool execution result to memory
                    }
                    continue;
                }

                // For non-movie-list tools (e.g., getMovieReviews), continue normal flow
                messages.add(aiMessage);
                chatMemory.add(aiMessage); // Persist AI request to memory

                for (ToolExecutionRequest ter : aiMessage.toolExecutionRequests()) {
                    String toolResult;
                    if ("getMovieReviews".equals(ter.name())) {
                        MovieReviewToolResult reviewResult = executeMovieReview(ter);
                        toolResult = reviewResult.serializedResult();
                        externalMovieReview = reviewResult.review();
                    } else {
                        toolResult = executeToolByName(ter);
                    }
                    LOG.debugf("Tool %s executed", ter.name());
                    ToolExecutionResultMessage resultMessage = ToolExecutionResultMessage.from(ter, toolResult);
                    messages.add(resultMessage);
                    chatMemory.add(resultMessage); // Persist tool execution result to memory
                }

                continue;
            }

            // Check if we have a final text answer
            if (aiMessage.text() != null && !aiMessage.text().trim().isEmpty()) {
                LOG.infof("Got final text response at iteration %d", iteration);
                chatMemory.add(aiMessage); // Persist final response to memory
                boolean hasMovieDetailLink = detailMovieLinks != null && !detailMovieLinks.isEmpty();
                boolean hasExternalReview = externalMovieReview != null;
                String finalAnswer = normalizeAnswerSpacing(aiMessage.text());
                if (hasExternalReview && !finalAnswer.toUpperCase().contains("TMDB")) {
                    finalAnswer += "\n\n*Nguồn dữ liệu ngoài: TMDB*";
                }
                return remember(cacheKey, ChatResponse.builder()
                        .conversationId(conversationId)
                        .answer(finalAnswer)
                        .type(hasMovieDetailLink ? "MOVIE_DETAIL" : hasExternalReview ? "MOVIE_REVIEW" : "TEXT")
                        .data(hasMovieDetailLink ? detailMovieLinks : null)
                        .review(externalMovieReview)
                        .timestamp(LocalDateTime.now().toString())
                        .build());
            }

            // Empty response
            LOG.warnf("AI returned empty response at iteration %d", iteration);
            AiMessage emptyFallback = AiMessage.from("Xin lỗi, tôi không thể xử lý yêu cầu của bạn ngay lúc này. Vui lòng thử lại.");
            chatMemory.add(emptyFallback);
            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .answer(emptyFallback.text())
                    .type("TEXT")
                    .timestamp(LocalDateTime.now().toString())
                    .build();
        }

        LOG.warnf("Max tool iterations (%d) reached", MAX_TOOL_ITERATIONS);
        AiMessage maxIterationFallback = AiMessage.from("Xin lỗi, tôi đã gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại với câu hỏi đơn giản hơn.");
        chatMemory.add(maxIterationFallback);
        return ChatResponse.builder()
                .conversationId(conversationId)
                .answer(maxIterationFallback.text())
                .type("TEXT")
                .timestamp(LocalDateTime.now().toString())
                .build();
    }

    /**
     * Handle a searchMovies tool call by executing it and returning a MOVIE_LIST structured response.
     * <p>
     * This is ONLY used for "list" queries (genre filter, limit > 1, no specific keyword).
     * For "detail" queries (specific movie name in keyword), the LLM continues its tool loop
     * and generates a detailed text response with movie information.
     * </p>
     * <p>
     * This approach gives the best UX:
     * - List queries → clickable movie links (fast, no LLM text generation wait)
     * - Detail queries → rich text response from LLM with full movie details
     * </p>
     */
    private MovieListResult handleMovieListResponse(List<ToolExecutionRequest> toolRequests, String conversationId) {
        try {
            // Find the searchMovies request
            ToolExecutionRequest searchRequest = toolRequests.stream()
                    .filter(ter -> "searchMovies".equals(ter.name()))
                    .findFirst()
                    .orElse(null);

            if (searchRequest == null) {
                return new MovieListResult(ChatResponse.builder()
                        .conversationId(conversationId)
                        .answer("Không tìm thấy yêu cầu tìm phim.")
                        .type("TEXT")
                        .timestamp(LocalDateTime.now().toString())
                        .build(), null);
            }

            // Parse arguments into strongly typed request object
            MovieSearchRequest searchRequestObj = MAPPER.readValue(searchRequest.arguments(), MovieSearchRequest.class)
                    .sanitized();

            LOG.infof("MOVIE_LIST - request: %s", searchRequestObj);

            // Determine if this is a "list" query or a "detail" query
            // List query: has genre, or limit > 1, or no specific keyword
            // Detail query: has a specific movie name as keyword (e.g. "The Gray Man", "Inception")
            boolean isListQuery = isListRequest(searchRequestObj);

            if (!isListQuery) {
                // This is a detail query (specific movie name).
                // Let the LLM continue its tool loop to generate a detailed text response.
                LOG.infof("Detail query detected - letting LLM generate text response");
                return null; // Signal to caller to continue the tool loop
            }

            return new MovieListResult(buildMovieListResponse(searchRequestObj, conversationId), searchRequestObj);

        } catch (Exception e) {
            LOG.errorf("Error handling MOVIE_LIST response: %s", e.getMessage());
            return new MovieListResult(ChatResponse.builder()
                    .conversationId(conversationId)
                    .answer("Có lỗi xảy ra khi tìm kiếm phim: " + e.getMessage())
                    .type("TEXT")
                    .timestamp(LocalDateTime.now().toString())
                    .build(), null);
        }
    }

    private ChatResponse buildMovieListResponse(MovieSearchRequest searchRequest, String conversationId) {
        List<MovieDto> movies = movieSearchTool.searchMovies(searchRequest);
        List<MovieSummaryDTO> summaries = movies.stream()
                .map(movie -> MovieSummaryDTO.builder()
                        .id(movie.getIdMovie())
                        .title(movie.getNameMovie())
                        .build())
                .collect(Collectors.toList());

        LOG.infof("MOVIE_LIST response: %d movies", summaries.size());

        return ChatResponse.builder()
                .conversationId(conversationId)
                .type("MOVIE_LIST")
                .data(summaries)
                .timestamp(LocalDateTime.now().toString())
                .build();
    }

    private ChatResponse handleBookingRequest(List<ToolExecutionRequest> toolRequests, String conversationId) {
        try {
            ToolExecutionRequest toolRequest = toolRequests.stream()
                    .filter(ter -> "prepareBooking".equals(ter.name()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Thiếu yêu cầu chuẩn bị đặt vé"));

            BookingIntentRequest booking = MAPPER.readValue(
                    toolRequest.arguments(), BookingIntentRequest.class).sanitized();
            if (booking.getMovieTitle() == null) {
                return ChatResponse.builder()
                        .conversationId(conversationId)
                        .answer("Bạn muốn mình đặt vé cho phim nào?")
                        .type("TEXT")
                        .timestamp(LocalDateTime.now().toString())
                        .build();
            }

            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .answer("Mình đã hiểu yêu cầu. Đang kiểm tra suất chiếu và ghế còn trống để gửi bạn xác nhận.")
                    .type("BOOKING_REQUEST")
                    .booking(booking)
                    .timestamp(LocalDateTime.now().toString())
                    .build();
        } catch (Exception e) {
            LOG.errorf("Could not parse booking request: %s", e.getMessage());
            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .answer("Mình chưa hiểu đủ thông tin đặt vé. Bạn vui lòng cho biết tên phim, ngày, khoảng giờ và số lượng ghế.")
                    .type("TEXT")
                    .timestamp(LocalDateTime.now().toString())
                    .build();
        }
    }

    /**
     * Determine if a search request is a "list" query (should return MOVIE_LIST)
     * or a "detail" query (should let LLM generate text response).
     * <p>
     * A request is considered a "list" query if:
     * - It has a genre filter (e.g. "ACTION", "COMEDY")
     * - It has limit > 1 (e.g. "5 phim")
     * - It has no keyword (just browsing)
     * - It has sortBy set without a specific keyword
     * <p>
     * A request is considered a "detail" query if:
     * - It has a specific movie name as keyword (e.g. "The Gray Man", "Inception")
     * - It has limit = 1 with a keyword
     */
    private boolean isListRequest(MovieSearchRequest request) {
        if (request.getPopularityMonth() != null || request.getPopularityYear() != null) {
            return true;
        }

        // If has a specific keyword and limit is not set or limit is 1, prioritize detail query
        if (request.getKeyword() != null && !request.getKeyword().isBlank() &&
                (request.getLimit() == null || request.getLimit() <= 1)) {
            return false;
        }

        // If has genre filter → list query
        if (request.getGenre() != null && !request.getGenre().isBlank()) {
            return true;
        }

        // If has showingDate → list query
        if (request.getShowingDate() != null && !request.getShowingDate().isBlank()) {
            return true;
        }

        // If has author/director filter → list query
        if (request.getAuthor() != null && !request.getAuthor().isBlank()) {
            return true;
        }

        // If has actorName filter → list query
        if (request.getActorName() != null && !request.getActorName().isBlank()) {
            return true;
        }

        // If has language filter → list query
        if (request.getLanguage() != null && !request.getLanguage().isBlank()) {
            return true;
        }

        // If limit > 1 → list query
        if (request.getLimit() != null && request.getLimit() > 1) {
            return true;
        }

        // If no keyword → list query (just browsing)
        if (request.getKeyword() == null || request.getKeyword().isBlank()) {
            return true;
        }

        // Has keyword but it's a specific movie name → detail query
        // Let the LLM generate a text response with movie details
        return false;
    }

    /**
     * Execute a tool by name using reflection-like dispatch.
     * The LLM provides the tool name and arguments; the backend only executes.
     */
    private String executeToolByName(ToolExecutionRequest request) {
        String toolName = request.name();
        String arguments = request.arguments();

        LOG.infof("Executing tool: %s", toolName);

        try {
            switch (toolName) {
                case "searchMovies": {
                    MovieSearchRequest searchRequest = MAPPER.readValue(arguments, MovieSearchRequest.class).sanitized();
                    List<MovieDto> movies = movieSearchTool.searchMovies(searchRequest);
                    return MAPPER.writeValueAsString(toCompactView(movies));
                }
                case "getMovieReviews": {
                    MovieReviewRequest reviewRequest = MAPPER.readValue(arguments, MovieReviewRequest.class).sanitized();
                    ReviewDto review = movieReviewTool.getMovieReviews(reviewRequest);
                    return MAPPER.writeValueAsString(review);
                }
                default:
                    LOG.warnf("Unknown tool: %s", toolName);
                    return "{\"error\": \"Unknown tool: " + toolName + "\"}";
            }
        } catch (Exception e) {
            LOG.errorf("Error executing tool %s: %s", toolName, e.getMessage());
            return "{\"error\": \"Failed to execute " + toolName + ": " + e.getMessage() + "\"}";
        }
    }

    private MovieDetailToolResult executeDetailMovieSearch(ToolExecutionRequest request) {
        try {
            MovieSearchRequest searchRequest = MAPPER.readValue(request.arguments(), MovieSearchRequest.class)
                    .sanitized();
            List<MovieDto> movies = movieSearchTool.searchMovies(searchRequest);
            List<MovieSummaryDTO> summaries = movies.stream()
                    .limit(1)
                    .map(movie -> MovieSummaryDTO.builder()
                            .id(movie.getIdMovie())
                            .title(movie.getNameMovie())
                            .build())
                    .collect(Collectors.toList());
            return new MovieDetailToolResult(MAPPER.writeValueAsString(toCompactView(movies)), summaries);
        } catch (Exception e) {
            LOG.errorf("Error executing detail movie search: %s", e.getMessage());
            return new MovieDetailToolResult(
                    "{\"error\": \"Failed to execute searchMovies: " + e.getMessage() + "\"}",
                    List.of());
        }
    }

    private MovieReviewToolResult executeMovieReview(ToolExecutionRequest request) {
        try {
            MovieReviewRequest reviewRequest = MAPPER.readValue(
                    request.arguments(), MovieReviewRequest.class).sanitized();
            ReviewDto review = movieReviewTool.getMovieReviews(reviewRequest);
            return new MovieReviewToolResult(MAPPER.writeValueAsString(review), review);
        } catch (Exception e) {
            LOG.errorf("Error executing external movie review lookup: %s", e.getMessage());
            return new MovieReviewToolResult(
                    "{\"error\": \"Failed to execute getMovieReviews\"}", null);
        }
    }

    /**
     * Build tool specifications from the @Tool annotations on tool classes.
     * Called once from init(); the result is reused for every request.
     */
    private List<dev.langchain4j.agent.tool.ToolSpecification> buildToolSpecifications() {
        List<dev.langchain4j.agent.tool.ToolSpecification> specs = new ArrayList<>();

        // searchMovies tool spec
        specs.add(dev.langchain4j.agent.tool.ToolSpecification.builder()
                .name("searchMovies")
                .description("Search for movies from the internal database. Call this whenever the user wants to find, list, search, or discover movies. Returns movie details including name, description, duration, language, actors, director, and categories. The database has movies like Inception, The Dark Knight, Avengers, etc. but does NOT have ratings or review scores.")
                .addParameter("keyword", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Free-text keyword to match against movie name, description, or actors. E.g. \"batman\", \"tom cruise\", \"avengers\""))
                .addParameter("genre", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Genre/category ID. Must be one of: ACTION, ADVENTURE, ANIMATION, COMEDY, DOCUMENTARY, DRAMA, FANTASY, HISTORICAL, HORROR, MYSTERY, ROMANCE, SCI_FI, THRILLER"))
                .addParameter("language", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Language name. E.g. \"English\", \"Korean\", \"Vietnamese\". Most movies are \"English\""))
                .addParameter("author", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Director/author name. E.g. \"Christopher Nolan\", \"James Cameron\""))
                .addParameter("actorName", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Actor name to search for. E.g. \"Tom Cruise\", \"Leonardo DiCaprio\""))
                .addParameter("page", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Page number (0-based). Default: 0"))
                .addParameter("limit", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Results per page. MUST be 1 when the user asks for the content, synopsis, or details of one named movie. Default: 10. Max: 50"))
                .addParameter("sortBy", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Sort field. Supported: \"createdAt\" (newest/oldest), \"nameMovie\" (alphabetical), \"duration\" (runtime). Default: \"createdAt\""))
                .addParameter("sortDirection", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("\"asc\" or \"desc\". Default: \"desc\""))
                .addParameter("showingDate", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Date to find movies showing on, format yyyy-MM-dd. For today/tonight use the date given in the NGAY HIEN TAI section of the system prompt. Uses showtime data"))
                .addParameter("startTime", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Optional earliest showtime on showingDate, inclusive, format HH:mm. Example: 19:00"))
                .addParameter("endTime", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Optional latest showtime on showingDate, inclusive, format HH:mm. Example: 23:00"))
                .addParameter("popularityMonth", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Month 1-12 for hot/popular movies ranked by actual sold-ticket count. Use the current month for 'this month'"))
                .addParameter("popularityYear", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Year for hot/popular movie ranking. Use the current year when omitted by the user"))
                .build());

        specs.add(dev.langchain4j.agent.tool.ToolSpecification.builder()
                .name("prepareBooking")
                .description("Parse a request to book or reserve cinema tickets. This prepares a live booking preview only; it never creates a booking. Use it when the user asks the chatbot to book tickets for a named movie. Do not use it for instructions about how to book.")
                .addParameter("movieTitle", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Movie title requested by the user. Required."))
                .addParameter("showingDate", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Requested date in yyyy-MM-dd. Resolve today/tomorrow using the current date in the system prompt."))
                .addParameter("startTime", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Start of the acceptable showtime range in HH:mm."))
                .addParameter("endTime", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("End of the acceptable showtime range in HH:mm."))
                .addParameter("seatCount", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Number of seats. Default to 1 if the user does not specify it."))
                .addParameter("seatPriority", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Comma-separated priority using VIP,STANDARD,COUPLE. Map Vietnamese 'thường' to STANDARD and unsupported 'triple' to COUPLE."))
                .addParameter("preferCenter", dev.langchain4j.agent.tool.JsonSchemaProperty.BOOLEAN,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("True when the user prefers seats near the horizontal and vertical center facing the screen."))
                .build());

        // getMovieReviews tool spec
        specs.add(dev.langchain4j.agent.tool.ToolSpecification.builder()
                .name("getMovieReviews")
                .description("Get movie reviews and ratings from the external TMDB API. Call this when the user asks about movie reviews, ratings, audience opinions, or critic feedback for a specific movie. Returns rating, overview, genres, review excerpts, and sentiment analysis.")
                .addParameter("movieTitle", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("The exact or approximate title of the movie to search for (e.g. \"Inception\", \"The Dark Knight\")"))
                .addParameter("releaseYear", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("The year of release to disambiguate movies with the same title (e.g. 2024)"))
                .addParameter("language", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Language for reviews (e.g. \"en-US\", \"vi-VN\"). Default: \"en-US\""))
                .addParameter("maxReviews", dev.langchain4j.agent.tool.JsonSchemaProperty.INTEGER,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Maximum number of review excerpts to return. Default: 5"))
                .build());

        return specs;
    }

    /** One conversation replayed turn-for-turn produces the same key at every turn. */
    private static String cacheKey(List<String> transcript) {
        synchronized (transcript) {
            return String.join("\\0", transcript).toLowerCase().trim();
        }
    }

    private ChatResponse lookupCachedAnswer(String key, String conversationId) {
        if (!aiConfig.isCacheEnabled()) {
            return null;
        }
        CachedAnswer hit = answerCache.get(key);
        if (hit == null) {
            return null;
        }
        long ageMinutes = (System.currentTimeMillis() - hit.storedAtMillis()) / 60_000;
        if (ageMinutes >= aiConfig.getCacheTtlMinutes()) {
            answerCache.remove(key);
            return null;
        }
        // Re-stamp so the client keeps tracking its own conversation, not the cached one.
        ChatResponse source = hit.response();
        MovieSearchRequest searchRequest = hit.searchRequest();
        if (searchRequest != null && (searchRequest.getShowingDate() != null
                || searchRequest.getPopularityMonth() != null
                || searchRequest.getPopularityYear() != null)) {
            try {
                source = buildMovieListResponse(searchRequest, conversationId);
            } catch (RuntimeException e) {
                LOG.warnf("Could not refresh cached showtime result: %s", e.getMessage());
                answerCache.remove(key);
                return null;
            }
        }
        return ChatResponse.builder()
                .conversationId(conversationId)
                .answer(source.getAnswer())
                .type(source.getType())
                .data(source.getData())
                .review(source.getReview())
                .timestamp(LocalDateTime.now().toString())
                .build();
    }

    private ChatResponse remember(String key, ChatResponse response) {
        return remember(key, response, null);
    }

    private ChatResponse remember(String key, ChatResponse response, MovieSearchRequest searchRequest) {
        if (aiConfig.isCacheEnabled()) {
            if (answerCache.size() >= MAX_CACHED_ANSWERS) {
                answerCache.clear();
            }
            answerCache.put(key, new CachedAnswer(response, searchRequest, System.currentTimeMillis()));
        }
        return response;
    }

    /**
     * Plain-text stand-in for a MOVIE_LIST answer so the next turn sees coherent history.
     */
    private String describeMovieList(ChatResponse response) {
        List<MovieSummaryDTO> data = response.getData();
        if (data == null || data.isEmpty()) {
            return "Đã tìm nhưng không có phim nào phù hợp.";
        }
        String titles = data.stream()
                .map(MovieSummaryDTO::getTitle)
                .collect(Collectors.joining(", "));
        return "Đã hiển thị cho người dùng danh sách " + data.size() + " phim: " + titles + ".";
    }

    /**
     * Poster URLs and full plot summaries are pure weight in the prompt - the model never
     * quotes them back - so strip them before the tool result re-enters the context.
     */
    private List<Map<String, Object>> toCompactView(List<MovieDto> movies) {
        List<Map<String, Object>> compact = new ArrayList<>();
        for (MovieDto movie : movies) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("idMovie", movie.getIdMovie());
            row.put("nameMovie", movie.getNameMovie());
            row.put("author", movie.getAuthor());
            row.put("duration", movie.getDuration());
            row.put("language", movie.getLanguage());
            row.put("actors", movie.getActors());
            row.put("categories", movie.getCategories());
            row.put("description", truncate(movie.getDescription(), DESCRIPTION_CHARS));
            compact.add(row);
        }
        return compact;
    }

    private static String truncate(String text, int maxChars) {
        if (text == null || text.length() <= maxChars) {
            return text;
        }
        return text.substring(0, maxChars).trim() + "…";
    }

    private static String normalizeAnswerSpacing(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\r\n", "\n")
                .replaceAll("(?m)[\\t ]+$", "")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    /**
     * The model has no clock of its own, so "phim đang chiếu hôm nay" would otherwise be
     * answered with whatever date happens to appear in the prompt examples. Append the
     * real date to the system prompt so showingDate is filled in correctly.
     */
    private String currentDateSection() {
        LocalDate today = LocalDate.now();
        return "\n\n===== NGÀY HIỆN TẠI =====\n"
                + "Hôm nay là " + today.format(DateTimeFormatter.ofPattern("EEEE dd/MM/yyyy"))
                + ", tức showingDate=\"" + today + "\".\n"
                + "Tháng hiện tại là " + today.getMonthValue() + "/" + today.getYear()
                + ", dùng popularityMonth=" + today.getMonthValue()
                + " và popularityYear=" + today.getYear() + " khi người dùng nói 'trong tháng' hoặc 'tháng này'.\n"
                + "- \"hôm nay\", \"đang chiếu\", \"tối nay\" -> showingDate=\"" + today + "\"\n"
                + "- \"ngày mai\" -> showingDate=\"" + today.plusDays(1) + "\"\n"
                + "- \"cuối tuần này\", \"sắp chiếu\" -> dùng một ngày từ " + today
                + " trở đi, KHÔNG dùng ngày quá khứ.\n"
                + "TUYỆT ĐỐI không lấy ngày trong các ví dụ ở trên làm ngày hiện tại.";
    }

    /**
     * Extract the system prompt from the @SystemMessage annotation on AIService interface.
     */
    private String getSystemPromptFromAnnotation() {
        try {
            java.lang.reflect.Method chatMethod = AIService.class.getMethod("chat", String.class, String.class);
            dev.langchain4j.service.SystemMessage annotation = chatMethod.getAnnotation(dev.langchain4j.service.SystemMessage.class);
            if (annotation != null) {
                return String.join("\n", annotation.value());
            }
        } catch (Exception e) {
            LOG.warnf("Could not extract system prompt from annotation: %s", e.getMessage());
        }
        return null;
    }

    /**
     * Free endpoints are rate limited, and a 429 halfway through a conversation would surface
     * as a dead chat box. Retry the turn once on the secondary model - a different vendor, so
     * a separate rate-limit pool - before letting the failure through.
     */
    private Response<AiMessage> generate(List<ChatMessage> messages) {
        try {
            return chatModel.generate(messages, toolSpecifications);
        } catch (RuntimeException primaryFailure) {
            // The daily cap is per account, so the fallback would burn another request and
            // fail identically. Only a provider-side limit is worth retrying elsewhere.
            if (fallbackChatModel == null || isDailyQuotaExhausted(primaryFailure)) {
                throw primaryFailure;
            }
            LOG.warnf("Primary model %s failed (%s) - retrying on fallback %s",
                    aiConfig.getModel(), primaryFailure.getMessage(), aiConfig.getFallbackModel());
            return fallbackChatModel.generate(messages, toolSpecifications);
        }
    }

    private ChatLanguageModel createChatModel(String modelName) {
        if ("openrouter".equalsIgnoreCase(aiConfig.getProvider())) {
            long timeoutSeconds = Math.max(aiConfig.getTimeout(), 120);

            return OpenAiChatModel.builder()
                    .apiKey(aiConfig.getApiKey())
                    .modelName(modelName)
                    .baseUrl(aiConfig.getBaseUrl())
                    .temperature(aiConfig.getTemperature())
                    .maxTokens(aiConfig.getMaxTokens())
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .logRequests(false)
                    .logResponses(false)
                    .build();
        } else if ("gemini".equalsIgnoreCase(aiConfig.getProvider())) {
            throw new UnsupportedOperationException("Gemini provider is deprecated. Please use OpenRouter.");
        } else {
            throw new IllegalStateException("Unsupported AI provider: " + aiConfig.getProvider());
        }
    }
}
