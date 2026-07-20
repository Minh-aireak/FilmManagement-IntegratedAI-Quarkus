package org.film.management.client;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.film.management.dto.TmdbMovieResponse;
import org.film.management.dto.TmdbReviewResponse;
import org.film.management.dto.TmdbSearchResponse;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/3")
@RegisterRestClient(configKey = "tmdb-api")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public interface TmdbClient {

    @GET
    @Path("/search/movie")
    TmdbSearchResponse searchMovie(
            @QueryParam("api_key") String apiKey,
            @QueryParam("query") String query,
            @QueryParam("language") String language,
            @QueryParam("page") @DefaultValue("1") int page
    );

    @GET
    @Path("/movie/{movie_id}")
    TmdbMovieResponse getMovieDetails(
            @PathParam("movie_id") String movieId,
            @QueryParam("api_key") String apiKey,
            @QueryParam("language") String language
    );

    @GET
    @Path("/movie/{movie_id}/reviews")
    TmdbReviewResponse getMovieReviews(
            @PathParam("movie_id") String movieId,
            @QueryParam("api_key") String apiKey,
            @QueryParam("language") String language,
            @QueryParam("page") @DefaultValue("1") int page
    );
}
