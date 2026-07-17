package org.film.management.repository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import org.film.management.entity.Showtime;

@ApplicationScoped
public class ShowtimeRepo implements PanacheRepositoryBase<Showtime, String> {}