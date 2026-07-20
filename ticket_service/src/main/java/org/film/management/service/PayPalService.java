package org.film.management.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@ApplicationScoped
public class PayPalService {

    @ConfigProperty(name = "paypal.client-id")
    String clientId;

    @ConfigProperty(name = "paypal.client-secret")
    String clientSecret;

    @ConfigProperty(name = "paypal.environment")
    String environment;

    @ConfigProperty(name = "paypal.vnd-to-usd-rate")
    long vndToUsdRate;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String baseUrl() {
        return "sandbox".equalsIgnoreCase(environment)
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";
    }

    public String toUsdAmount(int vndAmount) {
        return BigDecimal.valueOf(vndAmount)
                .divide(BigDecimal.valueOf(vndToUsdRate), 2, RoundingMode.HALF_UP)
                .max(new BigDecimal("0.01"))
                .toPlainString();
    }

    private String fetchAccessToken() {
        try {
            String credentials = Base64.getEncoder().encodeToString(
                    (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl() + "/v1/oauth2/token"))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Không lấy được access token PayPal: " + response.body());
            }

            JsonNode json = objectMapper.readTree(response.body());
            return json.get("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi xác thực với PayPal: " + e.getMessage(), e);
        }
    }

    public JsonNode createOrder(String idBill, int totalAmountVnd, String returnUrl, String cancelUrl) {
        try {
            String accessToken = fetchAccessToken();

            String body = objectMapper.writeValueAsString(java.util.Map.of(
                    "intent", "CAPTURE",
                    "purchase_units", java.util.List.of(java.util.Map.of(
                            "reference_id", idBill,
                            "amount", java.util.Map.of(
                                    "currency_code", "USD",
                                    "value", toUsdAmount(totalAmountVnd)
                            )
                    )),
                    "application_context", java.util.Map.of(
                            "return_url", returnUrl,
                            "cancel_url", cancelUrl,
                            "user_action", "PAY_NOW"
                    )
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl() + "/v2/checkout/orders"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201) {
                throw new RuntimeException("Không tạo được đơn hàng PayPal: " + response.body());
            }

            return objectMapper.readTree(response.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo đơn hàng PayPal: " + e.getMessage(), e);
        }
    }

    public JsonNode captureOrder(String paypalOrderId) {
        try {
            String accessToken = fetchAccessToken();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl() + "/v2/checkout/orders/" + paypalOrderId + "/capture"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201) {
                throw new RuntimeException("Không xác nhận được thanh toán PayPal: " + response.body());
            }

            return objectMapper.readTree(response.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi xác nhận thanh toán PayPal: " + e.getMessage(), e);
        }
    }
}
