package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ticket")
public class Ticket {
    @Id
    public String idTicket;
    public String idBill;
    public String idShowtime;
    public String seatCode;
    public int price;
}