package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.film.management.dto.response.ApiResponse;
import org.film.management.entity.Room;
import org.film.management.service.RoomService;

import java.util.List;

@Path("/rooms")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RoomController {

    @Inject
    RoomService roomService;

    @GET
    @RolesAllowed("ADMIN")
    public ApiResponse<List<Room>> getAllRooms() {
        return ApiResponse.<List<Room>>builder()
                .message("Get all rooms successfully!")
                .result(roomService.getAllRooms())
                .build();
    }

}