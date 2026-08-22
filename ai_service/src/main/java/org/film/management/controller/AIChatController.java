package org.film.management.controller;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.film.management.dto.ChatRequest;
import org.film.management.dto.ChatResponse;
import org.film.management.service.AIChatService;
import org.jboss.logging.Logger;

@Path("/ai")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AIChatController {

    private static final Logger LOG = Logger.getLogger(AIChatController.class);

    @Inject
    AIChatService aiChatService;

    @POST
    @Path("/chat")
    public Response chat(@Valid ChatRequest request) {
        try {
            LOG.infof("Received chat request: %s", request.getMessage());

            ChatResponse response = aiChatService.chat(request);

            return Response.ok(response).build();

        } catch (Exception e) {
            LOG.errorf("Error processing chat request: %s", e.getMessage());
            // Built as a map, not string concatenation: a message containing a quote or a
            // newline used to produce malformed JSON that the frontend could not parse,
            // turning every backend error into an unhelpful "unknown error" in the chat box.
            return Response.serverError()
                    .entity(java.util.Map.of("error", String.valueOf(e.getMessage())))
                    .build();
        }
    }

    @GET
    @Path("/health")
    public Response health() {
        return Response.ok("{\"status\": \"healthy\"}").build();
    }
}
