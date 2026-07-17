package org.film.management.dto;

import org.film.management.entity.Bill;
import org.film.management.entity.Ticket;
import java.time.LocalDateTime;
import java.util.List;

public class AdminBillResponseDTO {
    public String idBill;
    public String idAccount;
    public LocalDateTime createdAt;
    public int totalAmount;
    public List<Ticket> tickets;
    public String movieName;
    public LocalDateTime showTime;

    public AdminBillResponseDTO() {}

    public AdminBillResponseDTO(Bill bill, List<Ticket> tickets, String movieName, LocalDateTime showTime) {
        this.idBill = bill.idBill;
        this.idAccount = bill.idAccount;
        this.createdAt = bill.createdAt;
        this.totalAmount = bill.totalAmount;
        this.tickets = tickets;
        this.movieName = movieName;
        this.showTime = showTime;
    }
}
