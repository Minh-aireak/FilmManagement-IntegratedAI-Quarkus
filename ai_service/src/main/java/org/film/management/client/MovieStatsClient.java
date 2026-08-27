package org.film.management.client;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.film.management.dto.MovieStatsResponse;

@Path("/stats")
@RegisterRestClient(configKey = "movie-service")
@Produces(MediaType.APPLICATION_JSON)
public interface MovieStatsClient {

    @GET
    @Path("/dashboard")
    MovieStatsResponse getDashboardStats(
            @QueryParam("month") int month,
            @QueryParam("year") int year
    );
}
