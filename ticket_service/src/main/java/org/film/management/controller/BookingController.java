package org.film.management.controller;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.film.management.dto.BookingRequest;
import org.film.management.dto.SeatStatusDTO;
import org.film.management.service.BookingService;
import io.quarkus.security.Authenticated;

import java.util.List;

@Path("")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BookingController {

    @Inject BookingService bookingService;

    @GET
    @Path("/bookings/seats/{idShowtime}")
    public Response getBookedSeats(@PathParam("idShowtime") String idShowtime) {
        List<String> bookedSeats = bookingService.getBookedSeats(idShowtime);

        return Response.ok(bookedSeats).build();
    }

    @GET
    @Path("/bookings/seats/status/{idShowtime}")
    public Response getSeatStatuses(@PathParam("idShowtime") String idShowtime) {
        try {
            List<SeatStatusDTO> seats = bookingService.getSeatStatuses(idShowtime);
            return Response.ok(seats).build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/bookings")
    @Authenticated
    public Response bookTickets(BookingRequest request) {
        try {
            return Response.ok(bookingService.bookTickets(request)).build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/tickets/bills/{idBill}")
    @Authenticated
    public Response getBillDetail(@PathParam("idBill") String idBill) {
        try {
            return Response.ok(bookingService.getBillDetail(idBill)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.NOT_FOUND).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/tickets/history")
    @Authenticated
    public Response getHistory() {
        try {
            return Response.ok(bookingService.getMyBookingHistory()).build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.UNAUTHORIZED).entity(e.getMessage()).build();
        }
    }

    @DELETE
    @Path("/tickets/cancel/{idBill}")
    @Authenticated
    public Response cancelBooking(@PathParam("idBill") String idBill) {
        try {
            bookingService.cancelBill(idBill);
            return Response.ok("Hủy vé thành công và đã hoàn trả ghế trống").build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @GET
    @Path("/tickets/admin/bills")
    @RolesAllowed("ADMIN")
    public Response getAllBills(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("10") int size,
            @QueryParam("searchTerm") String searchTerm,
            @QueryParam("idMovie") String idMovie,
            @QueryParam("idShowtime") String idShowtime) {
        return Response.ok(bookingService.getAllBillsForAdmin(page, size, searchTerm, idMovie, idShowtime)).build();
    }

}
