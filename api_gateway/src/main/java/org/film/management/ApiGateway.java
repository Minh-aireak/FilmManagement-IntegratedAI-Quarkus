package org.film.management;

import io.vertx.core.Vertx;
import io.vertx.core.http.HttpClient;
import io.vertx.core.http.HttpClientOptions;
import io.vertx.core.http.HttpClientRequest;
import io.vertx.core.http.HttpHeaders;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.http.HttpMethod;
import io.vertx.ext.web.handler.CorsHandler;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.HashSet;
import java.util.Set;

@ApplicationScoped
public class ApiGateway {

    @Inject
    Vertx vertx;

    @ConfigProperty(name = "identity.service.host", defaultValue = "localhost")
    String identityHost;

    @ConfigProperty(name = "movie.service.host", defaultValue = "localhost")
    String movieHost;

    @ConfigProperty(name = "ticket.service.host", defaultValue = "localhost")
    String ticketHost;

    private HttpClient httpClient;

    @PostConstruct
    void init() {
        HttpClientOptions options = new HttpClientOptions()
                .setConnectTimeout(5000)
                .setIdleTimeout(30);

        httpClient = vertx.createHttpClient(options);
    }

    void setupRoutes(@Observes Router router) {
        // Add CORS handler
        Set<String> allowedHeaders = new HashSet<>();
        allowedHeaders.add("x-requested-with");
        allowedHeaders.add("Access-Control-Allow-Origin");
        allowedHeaders.add("origin");
        allowedHeaders.add("Content-Type");
        allowedHeaders.add("accept");
        allowedHeaders.add("Authorization");

        Set<HttpMethod> allowedMethods = new HashSet<>();
        allowedMethods.add(HttpMethod.GET);
        allowedMethods.add(HttpMethod.POST);
        allowedMethods.add(HttpMethod.OPTIONS);
        allowedMethods.add(HttpMethod.DELETE);
        allowedMethods.add(HttpMethod.PUT);

        router.route().handler(CorsHandler.create()
                .addOrigin("http://localhost:5173")
                .allowedHeaders(allowedHeaders)
                .allowedMethods(allowedMethods)
                .allowCredentials(true));

        // Identity Service
        router.route("/auth/*")
                .handler(ctx -> forward(ctx, identityHost, 8080, "Identity"));

        router.route("/accounts/*")
                .handler(ctx -> forward(ctx, identityHost, 8080, "Identity"));

        // Movie Service
        router.route("/movies/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        router.route("/categories/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        router.route("/images/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        router.route("/showtimes/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        router.route("/rooms/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        router.route("/stats/*")
                .handler(ctx -> forward(ctx, movieHost, 8081, "Movie"));

        // Ticket Service
        router.route("/bookings/*")
                .handler(ctx -> forward(ctx, ticketHost, 8082, "Ticket"));

        router.route("/tickets/*")
                .handler(ctx -> forward(ctx, ticketHost, 8082, "Ticket"));
    }

    private void forward(
            RoutingContext context,
            String host,
            int port,
            String serviceName
    ) {

        String uri = context.request().uri();

        System.out.println(
                "[Gateway] Routing to "
                        + serviceName
                        + " (" + host + ":" + port + "): "
                        + uri
        );

        httpClient.request(
                context.request().method(),
                port,
                host,
                uri
        ).onSuccess(proxyRequest -> {

            copyRequestHeaders(context, proxyRequest, host, port);

            handleProxyResponse(context, proxyRequest, serviceName);

            context.request()
                    .pipeTo(proxyRequest)
                    .onFailure(error -> fail(context, serviceName, error));

        }).onFailure(error -> fail(context, serviceName, error));
    }

    private void copyRequestHeaders(
            RoutingContext context,
            HttpClientRequest proxyRequest,
            String host,
            int port
    ) {

        context.request().headers().forEach(header -> {
            String name = header.getKey();
            if (!isHopByHopHeader(name)) {
                proxyRequest.putHeader(name, header.getValue());
            }
        });

        proxyRequest.putHeader(
                HttpHeaders.HOST,
                host + ":" + port
        );
    }

    private void handleProxyResponse(
            RoutingContext context,
            HttpClientRequest proxyRequest,
            String serviceName
    ) {

        proxyRequest.response().onSuccess(proxyResponse -> {

            HttpServerResponse clientResponse = context.response();

            // status code
            clientResponse.setStatusCode(proxyResponse.statusCode());

            // enable chunked streaming
            clientResponse.setChunked(true);

            // copy response headers
            proxyResponse.headers().forEach(header -> {
                String name = header.getKey();
                if (!isHopByHopHeader(name) && !isCorsHeader(name)) {
                    clientResponse.putHeader(name, header.getValue());
                }
            });

            // STREAM response body
            proxyResponse
                    .pipeTo(clientResponse)
                    .onFailure(error -> fail(context, serviceName, error));

        }).onFailure(error -> fail(context, serviceName, error));
    }

    private boolean isCorsHeader(String name) {
        return name.toLowerCase().startsWith("access-control-");
    }

    private boolean isHopByHopHeader(String name) {

        return HttpHeaders.HOST.toString().equalsIgnoreCase(name)
                || HttpHeaders.CONNECTION.toString().equalsIgnoreCase(name);
    }

    private void fail(
            RoutingContext context,
            String serviceName,
            Throwable error
    ) {

        System.err.println(
                "[Gateway] "
                        + serviceName
                        + " proxy failed: "
                        + error.getMessage()
        );

        error.printStackTrace();

        if (!context.response().ended()) {

            context.response()
                    .setStatusCode(502)
                    .putHeader("Content-Type", "text/plain")
                    .end("Bad Gateway");
        }
    }
}