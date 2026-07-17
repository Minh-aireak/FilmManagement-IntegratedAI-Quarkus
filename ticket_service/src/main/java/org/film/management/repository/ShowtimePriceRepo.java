package org.film.management.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.ShowtimePrice;

@ApplicationScoped
public class ShowtimePriceRepo implements PanacheRepositoryBase<ShowtimePrice, String> {
    // Sử dụng PanacheRepositoryBase vì ID là String (idShowtime)
}