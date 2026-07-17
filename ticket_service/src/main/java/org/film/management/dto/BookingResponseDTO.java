package org.film.management.dto;

import org.film.management.entity.Bill;
import org.film.management.entity.Ticket;
import java.util.List;

public class BookingResponseDTO {
    public Bill bill;
    public List<Ticket> tickets;

    public BookingResponseDTO(Bill bill, List<Ticket> tickets) {
        this.bill = bill;
        this.tickets = tickets;
    }
}