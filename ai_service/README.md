# AI Service - Movie Recommendation and Review Assistant

## Overview

AI Service là một microservice được xây dựng với Quarkus và LangChain4j để cung cấp khả năng AI cho hệ thống quản lý phim. Service hỗ trợ 2 chức năng chính:

1. **Movie Recommendation** - Gợi ý phim từ dữ liệu nội bộ dựa trên các tiêu chí của người dùng
2. **Movie Review Assistant** - Cung thông tin đánh giá phim từ external API (TMDB)

## Architecture

```
Frontend React
        |
API Gateway (Port 8888)
        |
ai-service (Port 8083)
        |
        +----------------+
        |                |
        v                v
movie-service      External Review API
(Port 8081)         (TMDB API)
        |
    Internal Database
```

## Request Flow

### 1. Movie Recommendation Flow

```
User Request
    ↓
Frontend sends POST /ai/chat
    ↓
API Gateway routes to ai-service (Port 8083)
    ↓
AIChatController.chat()
    ↓
AIChatService.chat()
    ↓
LangChain4j AI Service with Tool Calling
    ↓
MovieSearchTool.searchMovies()
    ↓
MovieServiceClient (REST Client)
    ↓
movie-service (Port 8081)
    ↓
Internal Database
    ↓
Return movie data to AI
    ↓
AI synthesizes response
    ↓
Return ChatResponse to user
```

### 2. Movie Review Flow

```
User Request
    ↓
Frontend sends POST /ai/chat
    ↓
API Gateway routes to ai-service (Port 8083)
    ↓
AIChatController.chat()
    ↓
AIChatService.chat()
    ↓
LangChain4j AI Service with Tool Calling
    ↓
MovieReviewTool.getMovieReviews()
    ↓
TmdbClient (REST Client)
    ↓
TMDB API
    ↓
Return review data to AI
    ↓
AI synthesizes response
    ↓
Return ChatResponse to user
```

## Technology Stack

- **Java 25** - Programming language
- **Quarkus 3.35.2** - Framework
- **LangChain4j 0.36.2** - AI integration framework
- **RESTEasy Reactive** - REST API
- **REST Client Reactive** - External API calls
- **CDI** - Dependency Injection
- **Lombok** - Reduce boilerplate code
- **OpenRouter API** - AI provider (OpenAI-compatible)

## Package Structure

```
ai_service/
├── src/main/java/org/film/management/
│   ├── ai/
│   │   ├── AIService.java              # AI Service interface with LangChain4j
│   │   └── tools/
│   │       ├── MovieSearchTool.java    # Tool for searching movies
│   │       └── MovieReviewTool.java    # Tool for getting movie reviews
│   ├── client/
│   │   ├── MovieServiceClient.java     # REST Client for movie-service
│   │   └── TmdbClient.java             # REST Client for TMDB API
│   ├── config/
│   │   ├── AIConfig.java              # AI configuration
│   │   ├── MovieServiceConfig.java    # Movie service configuration
│   │   └── TmdbConfig.java            # TMDB configuration
│   ├── controller/
│   │   └── AIChatController.java      # REST API controller
│   ├── dto/
│   │   ├── ChatRequest.java           # Chat request DTO
│   │   ├── ChatResponse.java          # Chat response DTO
│   │   ├── MovieDto.java              # Movie DTO
│   │   ├── ReviewDto.java             # Review DTO
│   │   ├── MovieSearchRequest.java    # Movie search request
│   │   ├── MovieServiceResponse.java  # Movie service response wrapper
│   │   ├── MovieServiceMovieResponse.java # Movie service movie response
│   │   ├── TmdbSearchResponse.java    # TMDB search response
│   │   ├── TmdbMovieResponse.java    # TMDB movie response
│   │   └── TmdbReviewResponse.java    # TMDB review response
│   ├── exception/
│   │   ├── AIServiceException.java   # Custom exception
│   │   └── GlobalExceptionHandler.java # Global exception handler
│   └── service/
│       └── AIChatService.java         # AI chat service implementation
└── src/main/resources/
    └── application.properties        # Configuration file
```

## API Endpoints

### POST /ai/chat
Chat with AI assistant for movie recommendations and reviews.

**Request:**
```json
{
  "message": "Gợi ý phim hành động dưới 2 tiếng"
}
```

**Response:**
```json
{
  "answer": "Dựa trên yêu cầu của bạn, tôi tìm thấy các phim hành động dưới 120 phút...",
  "movies": [
    {
      "idMovie": "Movie_123",
      "nameMovie": "John Wick",
      "author": "Chad Stahelski",
      "actors": "Keanu Reeves",
      "duration": "101 phút",
      "language": "Tiếng Anh",
      "description": "...",
      "image": "https://...",
      "categories": ["Hành động", "Giật gân"]
    }
  ],
  "review": null
}
```

### GET /ai/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Configuration

### Environment Variables

Required environment variables:

```bash
# For OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key

# For TMDB
TMDB_API_KEY=your_tmdb_api_key
```

### Application Properties

Key configuration properties in `application.properties`:

```properties
# AI Configuration
ai.provider=openrouter
openrouter.api-key=${OPENROUTER_API_KEY}
openrouter.base-url=https://openrouter.ai/api/v1
openrouter.model=nvidia/nemotron-3-ultra-550b-a55b:free
ai.temperature=0.3
ai.timeout=30

# Movie Service Configuration
movie-service.url=http://localhost:8081
movie-service.timeout=30
movie-service.max-retries=3

# TMDB Configuration
tmdb.api-key=${TMDB_API_KEY}
tmdb.url=https://api.themoviedb.org
tmdb.language=vi-VN
tmdb.timeout=30
tmdb.max-retries=3
```

## Tool Calling Mechanism

AI Service sử dụng LangChain4j's Tool Calling để cho phép AI tương tác với external services:

1. **MovieSearchTool** - Cho phép AI tìm kiếm phim từ internal database
   - Input: category, maxDuration, minRating, keyword, language
   - Output: List of MovieDto

2. **MovieReviewTool** - Cho phép AI lấy thông tin review từ TMDB
   - Input: movieTitle
   - Output: ReviewDto với rating, reviews, sentiment

AI tự động quyết định khi nào gọi tool nào dựa trên câu hỏi của user.

## AI System Prompt

```
Bạn là trợ lý phim thông minh cho hệ thống đặt vé xem phim.

QUY TẮC QUAN TRỌNG:
- Bạn KHÔNG tự tạo dữ liệu phim
- Với thông tin phim đặt vé, hãy sử dụng movie-service thông qua tool searchMovies
- Với review phim, hãy sử dụng external review API thông qua tool getMovieReviews
- Chỉ trả lời dựa trên dữ liệu nhận được từ các tool
- Hãy trả lời bằng tiếng Việt một cách tự nhiên và hữu ích

KHI USER HỎI VỀ PHIM ĐẶT VÉ:
- Sử dụng tool searchMovies với các tham số phù hợp
- Tổng hợp kết quả và gợi ý phim phù hợp

KHI USER HỎI VỀ REVIEW PHIM:
- Sử dụng tool getMovieReviews với tên phim
- Tổng hợp thông tin đánh giá, điểm số, và ý kiến phổ biến
```

## Extension Points

### 1. Thêm Tool mới

Để thêm chức năng mới (ví dụ: dự đoán doanh thu):

1. Tạo tool class mới trong `ai/tools/`:
```java
@ApplicationScoped
public class RevenuePredictionTool {
    
    @Tool("Predict movie revenue based on historical data")
    public RevenuePrediction predictRevenue(String movieTitle) {
        // Implementation
    }
}
```

2. Register tool trong `AIChatService`:
```java
this.aiService = AiServices.builder(AIService.class)
    .chatLanguageModel(chatModel)
    .tools(movieSearchTool, movieReviewTool, revenuePredictionTool) // Add new tool
    .build();
```

3. Update system prompt trong `AIService.java` để hướng dẫn AI sử dụng tool mới.

### 2. Thêm External API mới

Để tích hợp API bên ngoài mới:

1. Tạo REST Client interface trong `client/`:
```java
@Path("/api")
@RegisterRestClient(configKey = "new-api")
public interface NewApiClient {
    @GET
    @Path("/endpoint")
    NewApiResponse getData(@QueryParam("param") String param);
}
```

2. Tạo DTO classes trong `dto/` cho response
3. Tạo config class trong `config/`
4. Update `application.properties` với configuration mới
5. Tạo tool mới sử dụng client này

### 3. Custom AI Provider

Để thêm AI provider mới:

1. Update `AIChatService.createChatModel()`:
```java
else if ("new-provider".equalsIgnoreCase(aiConfig.getProvider())) {
    return NewProviderChatModel.builder()
        .apiKey(aiConfig.getApiKey())
        .modelName(aiConfig.getModel())
        .build();
}
```

### 4. Advanced Features

**Conversation History:**
- Thêm conversation storage (Redis, Database)
- Implement session management
- Maintain context across multiple messages

**User Personalization:**
- Integrate with user preferences
- Track user watch history
- Personalized recommendations

**Multi-language Support:**
- Detect user language automatically
- Support multiple languages in responses
- Localized movie information

## Error Handling

Service sử dụng global exception handler để xử lý errors:

- `AIServiceException` - Custom exception for AI-related errors
- `GlobalExceptionHandler` - Catches all exceptions and returns consistent error responses

Error response format:
```json
{
  "error": "Error message",
  "type": "ExceptionType"
}
```

## Timeout and Retry Configuration

- **REST Client Timeout**: 30 seconds for read operations, 5 seconds for connect
- **AI Model Timeout**: 30 seconds
- **Max Retries**: 3 attempts for external API calls

## Security Considerations

1. **API Keys**: Store in environment variables, never commit to code
2. **CORS**: Configured for frontend origin only
3. **Input Validation**: All requests validated using Jakarta Validation
4. **Rate Limiting**: Consider implementing rate limiting for AI API calls

## Deployment

### Local Development

```bash
# Set environment variables
export OPENROUTER_API_KEY=your_key
export TMDB_API_KEY=your_key

# Build and run
cd ai_service
../mvnw quarkus:dev
```

### Docker Deployment

```bash
# Build image
docker build -f src/main/docker/Dockerfile -t ai-service .

# Run container
docker run -p 8083:8083 \
  -e OPENROUTER_API_KEY=your_key \
  -e TMDB_API_KEY=your_key \
  ai-service
```

## Testing

### Kiểm tra nguồn dữ liệu phim ngoài (TMDB)

Test mặc định dùng một TMDB client giả có ghi nhận lời gọi. Nó xác nhận tool review gọi đủ ba API ngoài
`search/movie`, `movie/{id}` và `movie/{id}/reviews`, đồng thời không tự tạo review khi TMDB không tìm thấy phim:

```powershell
mvn -pl ai_service -Dtest=MovieReviewToolTest test
```

Để kiểm tra kết nối thật tới TMDB (test này mặc định được skip để không phụ thuộc mạng và không làm lộ API key):

```powershell
$env:TMDB_API_KEY='<your-tmdb-api-key>'
mvn -pl ai_service -Dtest=TmdbLiveApiTest -Dtmdb.live-tests=true test
```

Kiểm tra end-to-end qua chatbot sau khi các service đã chạy:

```powershell
$body = @{ message = 'Đánh giá phim Joker từ TMDB' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:8888/ai/chat' -ContentType 'application/json' -Body $body
```

Kết quả cần ghi rõ nguồn `TMDB`; log của `ai_service` phải có dòng `TMDB external source returned ...`.

Example curl commands:

```bash
# Movie recommendation
curl -X POST http://localhost:8888/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Gợi ý phim hành động dưới 120 phút"}'

# Movie review
curl -X POST http://localhost:8888/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Phim Avatar được đánh giá thế nào?"}'

# Health check
curl http://localhost:8888/ai/health
```

## Troubleshooting

**Common Issues:**

1. **AI API Connection Error**: Check API key and network connectivity
2. **Movie Service Unavailable**: Ensure movie-service is running on port 8081
3. **TMDB API Error**: Verify TMDB API key is valid
4. **Tool Not Called**: Check system prompt and tool method signatures

**Logging:**

Enable debug logging for troubleshooting:
```properties
quarkus.log.category."org.film.management".level=DEBUG
```

## Future Enhancements

1. **Revenue Prediction** - Dự đoán doanh thu phim dựa trên dữ liệu lịch sử
2. **Ticket Sales Prediction** - Dự đoán số vé bán dựa trên các yếu tố
3. **Sentiment Analysis** - Phân tích sentiment từ social media
4. **Personalized Recommendations** - Gợi ý phim dựa trên lịch sử xem của user
5. **Voice Support** - Hỗ trợ voice input/output
6. **Multi-turn Conversations** - Hỗ trợ hội thoại nhiều lượt
7. **Image Recognition** - Nhận diện poster phim để tìm kiếm
