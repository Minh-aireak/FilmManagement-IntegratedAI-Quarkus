package org.film.management.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.film.management.dto.MovieServiceResponse;
import org.film.management.dto.MovieServiceMovieResponse;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/movies")
@RegisterRestClient(configKey = "movie-service")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface MovieServiceClient {

    @GET
    MovieServiceResponse getMovies(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("10") int size,
            @QueryParam("category") String category
    );

    @GET
    @Path("/date/{date}")
    MovieServiceResponse getMoviesByDate(
            @PathParam("date") String date,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("10") int size
    );

    @GET
    @Path("/{idMovie}")
    MovieServiceMovieResponse getMovieById(@PathParam("idMovie") String idMovie);
}