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
import dev.langchain4j.service.AiServices;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.film.management.ai.AIService;
import org.film.management.ai.tools.MovieReviewTool;
import org.film.management.ai.tools.MovieSearchTool;
import org.film.management.config.AIConfig;
import org.film.management.dto.ChatRequest;
import org.film.management.dto.ChatResponse;
import org.film.management.dto.MovieDto;
import org.film.management.dto.MovieReviewRequest;
import org.film.management.dto.MovieSearchRequest;
import org.film.management.dto.MovieSummaryDTO;
import org.film.management.dto.ReviewDto;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
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

    private static final int MAX_TOOL_ITERATIONS = 5;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<String, ChatMemory> memories = new ConcurrentHashMap<>();

    @Inject
    AIConfig aiConfig;

    @Inject
    MovieSearchTool movieSearchTool;

    @Inject
    MovieReviewTool movieReviewTool;

    private AIService aiService;
    private ChatLanguageModel chatModel;

    @PostConstruct
    public void init() {
        LOG.infof("Initializing AI Chat Service with provider: %s, model: %s",
                aiConfig.getProvider(), aiConfig.getModel());

        this.chatModel = createChatModel();

        // Use AiServices to automatically:
        // 1. Bind @Tool annotated methods from tool instances
        // 2. Generate ToolSpecifications from @Tool annotations and parameter types
        // 3. Route tool execution requests to the correct method
        // 4. Inject the system prompt from @SystemMessage on the AIService interface
        this.aiService = AiServices.builder(AIService.class)
                .chatLanguageModel(chatModel)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.withMaxMessages(10))
                .tools(movieSearchTool, movieReviewTool)
                .build();

        LOG.info("AI Chat Service initialized successfully with AiServices");
    }

    public ChatResponse chat(ChatRequest request) {
        try {
            LOG.infof("=== CHAT REQUEST ===");
            LOG.infof("User message: %s", request.getMessage());
            LOG.infof("Model: %s", aiConfig.getModel());

            return executeToolLoop(request);

        } catch (Exception e) {
            LOG.errorf("Error processing chat message: %s", e.getMessage());
            LOG.errorf("Stack trace:", e);
            throw new org.film.management.exception.AIServiceException("Failed to process chat message: " + e.getMessage(), e);
        }
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
                id -> MessageWindowChatMemory.withMaxMessages(10));

        // Add user message to history
        chatMemory.add(UserMessage.from(request.getMessage()));

        // Add system prompt if not present in the chatMemory
        List<ChatMessage> history = chatMemory.messages();
        boolean hasSystemMessage = history.stream().anyMatch(m -> m instanceof SystemMessage);

        if (!hasSystemMessage) {
            String systemPrompt = getSystemPromptFromAnnotation();
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                chatMemory.add(SystemMessage.from(systemPrompt));
            }
        }

        // Load the full conversation history (which now includes system prompt + history + current user message)
        List<ChatMessage> messages = new ArrayList<>(chatMemory.messages());

        // Execute tool loop
        for (int iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
            LOG.debugf("--- AI Iteration %d ---", iteration);

            // Get tool specifications from the @Tool annotations
            List<dev.langchain4j.agent.tool.ToolSpecification> toolSpecs = getToolSpecifications();

            // Call the model
            Response<AiMessage> response = chatModel.generate(messages, toolSpecs);
            AiMessage aiMessage = response.content();

            LOG.debugf("AI response - text: %s", aiMessage.text());
            if (aiMessage.toolExecutionRequests() != null) {
                LOG.debugf("AI tool requests count: %d", aiMessage.toolExecutionRequests().size());
            }

            // Check if we have tool calls to execute
            if (aiMessage.toolExecutionRequests() != null && !aiMessage.toolExecutionRequests().isEmpty()) {
                LOG.infof("Executing %d tool(s) at iteration %d",
                        aiMessage.toolExecutionRequests().size(), iteration);

                // Check if this is a searchMovies request - return MOVIE_LIST immediately
                // This avoids waiting for the LLM to generate text, making the frontend render faster
                boolean hasSearchMovies = aiMessage.toolExecutionRequests().stream()
                        .anyMatch(ter -> "searchMovies".equals(ter.name()));

                if (hasSearchMovies) {
                    LOG.infof("Detected searchMovies tool call - checking if list or detail query");
                    ChatResponse movieListResponse = handleMovieListResponse(aiMessage.toolExecutionRequests(), conversationId);
                    if (movieListResponse != null) {
                        // List query - return MOVIE_LIST structured response immediately
                        // Add the AI message requesting tool to history
                        chatMemory.add(aiMessage);
                        return movieListResponse;
                    }
                    // Detail query (specific movie name) - continue tool loop to let LLM generate text
                    LOG.infof("Detail query - continuing tool loop for LLM text generation");
                    messages.add(aiMessage);
                    chatMemory.add(aiMessage); // Persist AI request to memory
                    for (ToolExecutionRequest ter : aiMessage.toolExecutionRequests()) {
                        String toolResult = executeToolByName(ter);
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
                    String toolResult = executeToolByName(ter);
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
                return ChatResponse.builder()
                        .conversationId(conversationId)
                        .answer(aiMessage.text())
                        .type("TEXT")
                        .timestamp(LocalDateTime.now().toString())
                        .build();
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
    private ChatResponse handleMovieListResponse(List<ToolExecutionRequest> toolRequests, String conversationId) {
        try {
            // Find the searchMovies request
            ToolExecutionRequest searchRequest = toolRequests.stream()
                    .filter(ter -> "searchMovies".equals(ter.name()))
                    .findFirst()
                    .orElse(null);

            if (searchRequest == null) {
                return ChatResponse.builder()
                        .conversationId(conversationId)
                        .answer("Không tìm thấy yêu cầu tìm phim.")
                        .type("TEXT")
                        .timestamp(LocalDateTime.now().toString())
                        .build();
            }

            // Parse arguments into strongly typed request object
            MovieSearchRequest searchRequestObj = MAPPER.readValue(searchRequest.arguments(), MovieSearchRequest.class);

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

            // Call the actual tool
            List<MovieDto> movies = movieSearchTool.searchMovies(searchRequestObj);

            // Convert to MovieSummaryDTO (id + title only for frontend rendering)
            List<MovieSummaryDTO> summaries = movies.stream()
                    .map(m -> MovieSummaryDTO.builder()
                            .id(m.getIdMovie())
                            .title(m.getNameMovie())
                            .build())
                    .collect(Collectors.toList());

            LOG.infof("MOVIE_LIST response: %d movies", summaries.size());

            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .type("MOVIE_LIST")
                    .data(summaries)
                    .timestamp(LocalDateTime.now().toString())
                    .build();

        } catch (Exception e) {
            LOG.errorf("Error handling MOVIE_LIST response: %s", e.getMessage());
            return ChatResponse.builder()
                    .conversationId(conversationId)
                    .answer("Có lỗi xảy ra khi tìm kiếm phim: " + e.getMessage())
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
                    MovieSearchRequest searchRequest = MAPPER.readValue(arguments, MovieSearchRequest.class);
                    List<MovieDto> movies = movieSearchTool.searchMovies(searchRequest);
                    return MAPPER.writeValueAsString(movies);
                }
                case "getMovieReviews": {
                    MovieReviewRequest reviewRequest = MAPPER.readValue(arguments, MovieReviewRequest.class);
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

    /**
     * Build tool specifications from the @Tool annotations on tool classes.
     * This is only used in the fallback path.
     */
    private List<dev.langchain4j.agent.tool.ToolSpecification> getToolSpecifications() {
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
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Results per page. Default: 10. Max: 50"))
                .addParameter("sortBy", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Sort field. Supported: \"createdAt\" (newest/oldest), \"nameMovie\" (alphabetical), \"duration\" (runtime). Default: \"createdAt\""))
                .addParameter("sortDirection", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("\"asc\" or \"desc\". Default: \"desc\""))
                .addParameter("showingDate", dev.langchain4j.agent.tool.JsonSchemaProperty.STRING,
                        dev.langchain4j.agent.tool.JsonSchemaProperty.description("Date to find movies showing on (format: yyyy-MM-dd, e.g. \"2026-07-20\"). Uses showtime data"))
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

    private ChatLanguageModel createChatModel() {
        if ("openrouter".equalsIgnoreCase(aiConfig.getProvider())) {
            long timeoutSeconds = Math.max(aiConfig.getTimeout(), 120);

            return OpenAiChatModel.builder()
                    .apiKey(aiConfig.getApiKey())
                    .modelName(aiConfig.getModel())
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