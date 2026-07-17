package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.dto.request.AddShowtimeRequest;
import org.film.management.dto.response.ApiResponse;
import org.film.management.dto.response.PageResponse;
import org.film.management.dto.response.ShowtimeResponse;
import org.film.management.entity.Showtime;
import org.film.management.service.ShowtimeService;

@Path("/showtimes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ShowtimeController {

    @Inject
    ShowtimeService showtimeService;

    @GET
    @Path("/{idMovie}")
    public ApiResponse<PageResponse<ShowtimeResponse>> getShowtimesByMovie(
            @PathParam("idMovie") String idMovie,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("10") int size) {
        return ApiResponse.<PageResponse<ShowtimeResponse>>builder()
                .message("Get showtime successfully!")
                .result(showtimeService.getShowtimesByMovie(idMovie, page, size))
                .build();
    }

    @GET
    public ApiResponse<PageResponse<ShowtimeResponse>> getAllShowtimes(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("10") int size,
            @QueryParam("status") String status,
            @QueryParam("movieId") String movieId,
            @QueryParam("date") String date,
            @QueryParam("roomId") String roomId) {
        return ApiResponse.<PageResponse<ShowtimeResponse>>builder()
                .message("Get all showtimes successfully!")
                .result(showtimeService.getAllShowtimes(page, size, status, movieId, date, roomId))
                .build();
    }

    @POST
    @RolesAllowed("ADMIN")
    public ApiResponse<Showtime> createShowtime(AddShowtimeRequest request) {
        return ApiResponse.<Showtime>builder()
                .message("Thêm lịch chiếu thành công!")
                .result(showtimeService.createShowtime(request))
                .build();
    }

    @DELETE
    @Path("/{idShowtime}")
    @RolesAllowed("ADMIN")
    public ApiResponse<Void> deleteShowtime(@PathParam("idShowtime") String idShowtime) {
        showtimeService.deleteShowtime(idShowtime);
        return ApiResponse.<Void>builder()
                .message("Xóa lịch chiếu thành công!")
                .build();
    }
}