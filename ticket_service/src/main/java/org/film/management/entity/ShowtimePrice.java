package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "showtime_price")
public class ShowtimePrice {
    @Id
    public String idShowtime;
    public int standardPrice;
    public int vipPrice;
    public int couplePrice;
}