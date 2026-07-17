package org.film.management.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Entity
@Data
@Builder
@Getter
@Setter
@Table(name = "showtime_price")
public class ShowtimePrice {
    @Id
    public String idShowtime;
    public int standardPrice;
    public int vipPrice;
    public int couplePrice;
}