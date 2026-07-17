package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "showtime")
public class Showtime {
    @Id
    public String idShowtime;
    public LocalDateTime showTime;
    public String idMovie;
    public String idRoom;
}