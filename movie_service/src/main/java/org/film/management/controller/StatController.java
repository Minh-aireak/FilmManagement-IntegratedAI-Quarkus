package org.film.management.controller;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.dto.response.ApiResponse;
import org.film.management.dto.response.DashboardStatsResponse;
import org.film.management.service.StatService;

@Path("/stats")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class StatController {

    @Inject
    StatService statService;

    @GET
    @Path("/dashboard")
    public ApiResponse<DashboardStatsResponse> getDashboardStats(
            @QueryParam("month") int month,
            @QueryParam("year") int year) {
        return ApiResponse.<DashboardStatsResponse>builder()
                .message("Get stats successfully!")
                .result(statService.getDashboardStats(month, year))
                .build();
    }

}