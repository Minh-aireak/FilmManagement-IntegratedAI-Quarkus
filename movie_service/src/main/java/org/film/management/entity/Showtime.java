package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@Getter
@Setter
@Table(name = "showtime")
public class Showtime {
    @Id
    public String idShowtime;
    public LocalDateTime showTime;
    public String idMovie;
    public String idRoom;
}